import Foundation
import SwiftData

enum EntryKind: String, CaseIterable, Codable, Identifiable {
    case expense
    case income

    var id: String { rawValue }
    var title: String { self == .expense ? "Расход" : "Доход" }
    var symbol: String { self == .expense ? "minus.circle.fill" : "plus.circle.fill" }
}

@Model
final class WalletCategory {
    @Attribute(.unique) var id: UUID
    var title: String
    var kindRaw: String
    var icon: String
    var isArchived: Bool
    var createdAt: Date
    var importedID: String?

    var kind: EntryKind { EntryKind(rawValue: kindRaw) ?? .expense }

    init(title: String, kind: EntryKind, icon: String = "tag.fill", importedID: String? = nil) {
        self.id = UUID()
        self.title = title
        self.kindRaw = kind.rawValue
        self.icon = icon
        self.isArchived = false
        self.createdAt = .now
        self.importedID = importedID
    }
}

@Model
final class WalletAccount {
    @Attribute(.unique) var id: UUID
    var title: String
    var currencyCode: String
    var initialBalance: Decimal
    var importedID: String?

    init(title: String, currencyCode: String = "RUB", initialBalance: Decimal = 0, importedID: String? = nil) {
        self.id = UUID()
        self.title = title
        self.currencyCode = currencyCode
        self.initialBalance = initialBalance
        self.importedID = importedID
    }
}

@Model
final class WalletEntry {
    @Attribute(.unique) var id: UUID
    var amount: Decimal
    var kindRaw: String
    var date: Date
    var note: String
    var importedID: String?
    var category: WalletCategory?
    var account: WalletAccount?

    var kind: EntryKind { EntryKind(rawValue: kindRaw) ?? .expense }

    init(amount: Decimal, kind: EntryKind, date: Date = .now, note: String = "", category: WalletCategory? = nil, account: WalletAccount? = nil, importedID: String? = nil) {
        self.id = UUID()
        self.amount = amount
        self.kindRaw = kind.rawValue
        self.date = date
        self.note = note
        self.category = category
        self.account = account
        self.importedID = importedID
    }
}
