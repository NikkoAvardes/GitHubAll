import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct ImportView: View {
    @Environment(\.modelContext) private var context
    @State private var isChoosingFile = false
    @State private var report: ImportReport?
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 22) {
                Image(systemName: "lock.document.fill")
                    .font(.system(size: 52))
                    .foregroundStyle(.tint)
                Text("Перенести данные из Monefy")
                    .font(.title2.bold())
                Text("Выберите файл резервной копии. Он будет расшифрован и обработан только на этом iPhone — в интернет ничего не отправляется.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)
                Button("Выбрать резервную копию") { isChoosingFile = true }
                    .buttonStyle(.borderedProminent)
            }
            .padding()
            .navigationTitle("Импорт")
            .fileImporter(isPresented: $isChoosingFile, allowedContentTypes: [.data]) { result in
                switch result {
                case .success(let url): importBackup(url)
                case .failure(let error): errorMessage = error.localizedDescription
                }
            }
            .alert("Импорт завершён", isPresented: Binding(get: { report != nil }, set: { if !$0 { report = nil } }), presenting: report) { _ in
                Button("Готово", role: .cancel) { report = nil }
            } message: { result in
                Text("Добавлено: \(result.entries) операций, \(result.categories) категорий и \(result.accounts) счетов.")
            }
            .alert("Не удалось импортировать", isPresented: Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) {
                Button("Закрыть", role: .cancel) { errorMessage = nil }
            } message: { Text(errorMessage ?? "Неизвестная ошибка") }
        }
    }

    private func importBackup(_ url: URL) {
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        do {
            report = try MonefyImporter().importBackup(from: url, into: context)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
