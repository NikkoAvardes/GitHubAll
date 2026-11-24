import SwiftUI
import SwiftData

struct CategoriesView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \WalletCategory.title) private var categories: [WalletCategory]
    @Query private var entries: [WalletEntry]
    @State private var showingNewCategory = false
    @State private var categoryToDelete: WalletCategory?

    var body: some View {
        NavigationStack {
            List {
                categorySection(for: .expense)
                categorySection(for: .income)
            }
            .navigationTitle("Категории")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showingNewCategory = true } label: { Image(systemName: "plus") }
                }
            }
            .sheet(isPresented: $showingNewCategory) { CategoryEditorView() }
            .alert("Удалить категорию?", isPresented: Binding(get: { categoryToDelete != nil }, set: { if !$0 { categoryToDelete = nil } }), presenting: categoryToDelete) { category in
                Button("Удалить", role: .destructive) { delete(category) }
                Button("Отмена", role: .cancel) { categoryToDelete = nil }
            } message: { category in
                Text("Операции категории «\(category.title)» сохранятся, но останутся без категории.")
            }
        }
    }

    @ViewBuilder
    private func categorySection(for kind: EntryKind) -> some View {
        Section(kind == .expense ? "Расходы" : "Доходы") {
            let filtered = categories.filter { !$0.isArchived && $0.kind == kind }
            if filtered.isEmpty { Text("Нет категорий").foregroundStyle(.secondary) }
            ForEach(filtered) { category in
                Label(category.title, systemImage: category.icon)
                    .swipeActions {
                        Button(role: .destructive) { categoryToDelete = category } label: { Label("Удалить", systemImage: "trash") }
                    }
            }
        }
    }

    private func delete(_ category: WalletCategory) {
        entries.filter { $0.category?.id == category.id }.forEach { $0.category = nil }
        context.delete(category)
        try? context.save()
        categoryToDelete = nil
    }
}

private struct CategoryEditorView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @State private var title = ""
    @State private var kind: EntryKind = .expense
    @State private var icon = "tag.fill"

    private let icons = ["tag.fill", "fork.knife", "car.fill", "house.fill", "heart.fill", "cart.fill", "gift.fill", "briefcase.fill"]

    var body: some View {
        NavigationStack {
            Form {
                TextField("Название", text: $title)
                Picker("Тип", selection: $kind) {
                    ForEach(EntryKind.allCases) { Text($0.title).tag($0) }
                }
                .pickerStyle(.segmented)
                Picker("Значок", selection: $icon) {
                    ForEach(icons, id: \.self) { Image(systemName: $0).tag($0) }
                }
            }
            .navigationTitle("Новая категория")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Отмена") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Добавить") {
                        context.insert(WalletCategory(title: title.trimmingCharacters(in: .whitespacesAndNewlines), kind: kind, icon: icon))
                        try? context.save()
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}
