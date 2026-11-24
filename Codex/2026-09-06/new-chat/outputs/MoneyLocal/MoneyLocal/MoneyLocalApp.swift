import SwiftUI
import SwiftData

@main
struct MoneyLocalApp: App {
    private let container: ModelContainer = {
        do {
            return try ModelContainer(for: WalletCategory.self, WalletAccount.self, WalletEntry.self)
        } catch {
            fatalError("Не удалось открыть локальное хранилище: \(error.localizedDescription)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.light)
        }
        .modelContainer(container)
    }
}
