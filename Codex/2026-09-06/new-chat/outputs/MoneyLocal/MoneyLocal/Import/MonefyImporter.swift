import CommonCrypto
import Foundation
import SQLite3
import SwiftData

struct ImportReport {
    let categories: Int
    let accounts: Int
    let entries: Int
}

enum MonefyImportError: LocalizedError {
    case unsupportedFile
    case databaseOpenFailed

    var errorDescription: String? {
        switch self {
        case .unsupportedFile: return "Это не резервная копия Monefy или файл повреждён."
        case .databaseOpenFailed: return "Не удалось прочитать данные из резервной копии."
        }
    }
}

@MainActor
struct MonefyImporter {
    private let encryptionKey = Array("MyDifficultPassw".utf8)

    func importBackup(from url: URL, into context: ModelContext) throws -> ImportReport {
        let encrypted = try Data(contentsOf: url)
        let databaseData = try decryptMonefyBackup(encrypted)
        guard databaseData.starts(with: Data("SQLite format 3\0".utf8)) else {
            throw MonefyImportError.unsupportedFile
        }

        let temporaryURL = FileManager.default.temporaryDirectory
            .appending(path: "monefy-\(UUID().uuidString).sqlite")
        defer { try? FileManager.default.removeItem(at: temporaryURL) }
        try databaseData.write(to: temporaryURL, options: .atomic)

        var database: OpaquePointer?
        guard sqlite3_open_v2(temporaryURL.path, &database, SQLITE_OPEN_READONLY, nil) == SQLITE_OK, let database else {
            throw MonefyImportError.databaseOpenFailed
        }
        defer { sqlite3_close(database) }

        let allCategories = try context.fetch(FetchDescriptor<WalletCategory>())
        let allAccounts = try context.fetch(FetchDescriptor<WalletAccount>())
        var categoriesByLegacyID = Dictionary(uniqueKeysWithValues: allCategories.compactMap { category in
            category.importedID.map { ($0, category) }
        })
        var accountsByLegacyID = Dictionary(uniqueKeysWithValues: allAccounts.compactMap { account in
            account.importedID.map { ($0, account) }
        })
        let knownEntryIDs = Set(try context.fetch(FetchDescriptor<WalletEntry>()).compactMap(\.importedID))

        var addedCategories = 0
        try rows(in: database, sql: "SELECT _id, title, categoryType FROM categories WHERE deletedOn IS NULL") { statement in
            guard let legacyID = text(statement, 0), let title = text(statement, 1) else { return }
            if categoriesByLegacyID[legacyID] == nil {
                let kind = text(statement, 2)?.lowercased() == "income" ? EntryKind.income : .expense
                if let existing = allCategories.first(where: { $0.importedID == nil && $0.title.caseInsensitiveCompare(title) == .orderedSame && $0.kind == kind }) {
                    existing.importedID = legacyID
                    categoriesByLegacyID[legacyID] = existing
                    return
                }
                let category = WalletCategory(title: title, kind: kind, importedID: legacyID)
                context.insert(category)
                categoriesByLegacyID[legacyID] = category
                addedCategories += 1
            }
        }

        var addedAccounts = 0
        try rows(in: database, sql: "SELECT accounts._id, accounts.title, accounts.initialAmountCents, COALESCE(Currency.alphabeticCode, 'RUB') FROM accounts LEFT JOIN Currency ON accounts.currencyId = Currency._id WHERE accounts.deletedOn IS NULL") { statement in
            guard let legacyID = text(statement, 0), let title = text(statement, 1) else { return }
            if accountsByLegacyID[legacyID] == nil {
                if let existing = allAccounts.first(where: { $0.importedID == nil && $0.title.caseInsensitiveCompare(title) == .orderedSame }) {
                    existing.importedID = legacyID
                    accountsByLegacyID[legacyID] = existing
                    return
                }
                let balance = decimal(statement, 2) / 1_000
                let account = WalletAccount(title: title, currencyCode: text(statement, 3) ?? "RUB", initialBalance: balance, importedID: legacyID)
                context.insert(account)
                accountsByLegacyID[legacyID] = account
                addedAccounts += 1
            }
        }
        let fallbackAccount = try LocalStore.defaultAccount(in: context)

        var addedEntries = 0
        try rows(in: database, sql: "SELECT _id, account_id, amountCents, category_id, createdOn, note FROM transactions WHERE deletedOn IS NULL") { statement in
            guard let legacyID = text(statement, 0), !knownEntryIDs.contains(legacyID) else { return }
            let category = text(statement, 3).flatMap { categoriesByLegacyID[$0] }
            let kind = category?.kind ?? .expense
            let milliseconds = sqlite3_column_int64(statement, 4)
            let entry = WalletEntry(
                amount: abs(decimal(statement, 2)) / 1_000,
                kind: kind,
                date: Date(timeIntervalSince1970: TimeInterval(milliseconds) / 1_000),
                note: text(statement, 5) ?? "",
                category: category,
                account: text(statement, 1).flatMap { accountsByLegacyID[$0] } ?? fallbackAccount,
                importedID: legacyID
            )
            context.insert(entry)
            addedEntries += 1
        }
        try context.save()
        return ImportReport(categories: addedCategories, accounts: addedAccounts, entries: addedEntries)
    }

    private func decryptMonefyBackup(_ encrypted: Data) throws -> Data {
        guard !encrypted.isEmpty, encrypted.count.isMultiple(of: kCCBlockSizeAES128) else {
            throw MonefyImportError.unsupportedFile
        }
        let inputLength = encrypted.count
        let outputCapacity = inputLength
        var decrypted = Data(count: outputCapacity)
        var outputLength = 0
        let status = decrypted.withUnsafeMutableBytes { output in
            encrypted.withUnsafeBytes { input in
                encryptionKey.withUnsafeBytes { key in
                    CCCrypt(CCOperation(kCCDecrypt), CCAlgorithm(kCCAlgorithmAES), CCOptions(kCCOptionECBMode), key.baseAddress, kCCKeySizeAES128, nil, input.baseAddress, inputLength, output.baseAddress, outputCapacity, &outputLength)
                }
            }
        }
        guard status == kCCSuccess else { throw MonefyImportError.unsupportedFile }
        return decrypted.prefix(outputLength)
    }

    private func rows(in database: OpaquePointer, sql: String, body: (OpaquePointer) throws -> Void) throws {
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(database, sql, -1, &statement, nil) == SQLITE_OK, let statement else {
            throw MonefyImportError.databaseOpenFailed
        }
        defer { sqlite3_finalize(statement) }
        while sqlite3_step(statement) == SQLITE_ROW { try body(statement) }
    }

    private func text(_ statement: OpaquePointer, _ index: Int32) -> String? {
        guard let rawValue = sqlite3_column_text(statement, index) else { return nil }
        return String(cString: rawValue)
    }

    private func decimal(_ statement: OpaquePointer, _ index: Int32) -> Decimal {
        Decimal(string: String(sqlite3_column_int64(statement, index))) ?? 0
    }
}
