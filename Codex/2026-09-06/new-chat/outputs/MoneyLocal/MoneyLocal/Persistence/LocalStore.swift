import Foundation
import SwiftData

@MainActor
enum LocalStore {
    static func defaultAccount(in context: ModelContext) throws -> WalletAccount {
        let descriptor = FetchDescriptor<WalletAccount>(sortBy: [SortDescriptor(\WalletAccount.title)])
        if let account = try context.fetch(descriptor).first { return account }
        let account = WalletAccount(title: "Наличные")
        context.insert(account)
        return account
    }

    static func seedCategoriesIfNeeded(in context: ModelContext) throws {
        guard try context.fetchCount(FetchDescriptor<WalletCategory>()) == 0 else { return }
        ["Еда", "Транспорт", "Дом", "Здоровье", "Развлечения"].forEach { context.insert(WalletCategory(title: $0, kind: .expense)) }
        ["Зарплата", "Подарки", "Другое"].forEach { context.insert(WalletCategory(title: $0, kind: .income)) }
        _ = try defaultAccount(in: context)
        try context.save()
    }
}
