import SwiftUI
import SwiftData

struct AddEntryView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @Query(sort: \WalletCategory.title) private var allCategories: [WalletCategory]
    @Query(sort: \WalletAccount.title) private var accounts: [WalletAccount]
    @State private var kind: EntryKind
    @State private var amount = ""
    @State private var selectedCategory: WalletCategory?
    @State private var selectedAccount: WalletAccount?
    @State private var date = Date()
    @State private var note = ""

    private var categories: [WalletCategory] { allCategories.filter { !$0.isArchived && $0.kind == kind } }
    private var parsedAmount: Decimal? { Decimal(string: amount.replacingOccurrences(of: ",", with: "."), locale: Locale(identifier: "en_US_POSIX")) }

    init(initialKind: EntryKind = .expense) {
        _kind = State(initialValue: initialKind)
    }

    var body: some View {
        NavigationStack {
            Form {
                Picker("Тип", selection: $kind) {
                    ForEach(EntryKind.allCases) { Text($0.title).tag($0) }
                }
                .pickerStyle(.segmented)
                .onChange(of: kind) { _, _ in selectedCategory = nil }

                Section("Сумма") {
                    TextField("0", text: $amount)
                        .keyboardType(.decimalPad)
                        .font(.title2)
                }
                Section("Детали") {
                    Picker("Категория", selection: $selectedCategory) {
                        Text("Выберите категорию").tag(Optional<WalletCategory>.none)
                        ForEach(categories) { Text($0.title).tag(Optional($0)) }
                    }
                    Picker("Счёт", selection: $selectedAccount) {
                        Text("Наличные").tag(Optional<WalletAccount>.none)
                        ForEach(accounts) { Text($0.title).tag(Optional($0)) }
                    }
                    DatePicker("Дата", selection: $date, displayedComponents: .date)
                    TextField("Заметка", text: $note, axis: .vertical)
                }
            }
            .navigationTitle("Новая операция")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Отмена") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Сохранить") { save() }.disabled(parsedAmount == nil || parsedAmount == 0)
                }
            }
        }
    }

    private func save() {
        guard let parsedAmount else { return }
        let account = selectedAccount ?? (try? LocalStore.defaultAccount(in: context))
        context.insert(WalletEntry(amount: abs(parsedAmount), kind: kind, date: date, note: note, category: selectedCategory, account: account))
        try? context.save()
        dismiss()
    }
}
