import Charts
import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \WalletEntry.date, order: .reverse) private var entries: [WalletEntry]
    @State private var entryKindToAdd: EntryKind?
    @State private var showingMenu = false
    @State private var showingCategories = false
    @State private var showingAccounts = false
    @State private var showingSettings = false
    @State private var showingImport = false
    @State private var period: ReportPeriod = .month
    @State private var referenceDate = Date()
    @State private var showingList = false

    private var displayedEntries: [WalletEntry] {
        guard let interval = period.interval(containing: referenceDate) else { return entries }
        return entries.filter { interval.contains($0.date) }
    }

    private var income: Decimal { displayedEntries.filter { $0.kind == .income }.reduce(0) { $0 + $1.amount } }
    private var expenses: Decimal { displayedEntries.filter { $0.kind == .expense }.reduce(0) { $0 + $1.amount } }
    private var balance: Decimal { income - expenses }

    private var categoryTotals: [CategoryTotal] {
        let groups = Dictionary(grouping: displayedEntries.filter { $0.kind == .expense }) { $0.category?.id.uuidString ?? "without-category" }
        return groups.enumerated().map { index, pair in
            let first = pair.value[0]
            return CategoryTotal(id: pair.key, title: first.category?.title ?? "Без категории", symbol: first.category?.icon ?? "tag.fill", amount: pair.value.reduce(0) { $0 + $1.amount }, colorIndex: index)
        }
        .sorted { $0.amount > $1.amount }
    }

    var body: some View {
        ZStack(alignment: .leading) {
            AppTheme.background.ignoresSafeArea()
            dashboard
                .disabled(showingMenu)
                .overlay { if showingMenu { Color.black.opacity(0.56).ignoresSafeArea().onTapGesture { closeMenu() } } }
            if showingMenu { menuDrawer.transition(.move(edge: .leading).combined(with: .opacity)) }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.9), value: showingMenu)
        .sheet(item: $entryKindToAdd) { AddEntryView(initialKind: $0) }
        .sheet(isPresented: $showingCategories) { CategoriesView() }
        .sheet(isPresented: $showingAccounts) { AccountsView() }
        .sheet(isPresented: $showingSettings) { SettingsView(openImport: { showingSettings = false; showingImport = true }) }
        .sheet(isPresented: $showingImport) { ImportView() }
        .task { try? LocalStore.seedCategoriesIfNeeded(in: context) }
    }

    private var dashboard: some View {
        GeometryReader { proxy in
            let chartHeight = max(310, min(proxy.size.height - 282, 510))
            VStack(spacing: 0) {
                header
                periodSelector
                if showingList {
                    ScrollView { categoryList.padding(.top, 26) }
                        .frame(maxHeight: .infinity)
                } else {
                    categoryOrbitChart(height: chartHeight)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                footer
            }
            .frame(width: proxy.size.width, height: proxy.size.height)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var header: some View {
        HStack(spacing: 14) {
            Button(action: { showingMenu = true }) {
                Image(systemName: "line.3.horizontal.decrease")
                    .font(.title3.weight(.semibold)).frame(width: 42, height: 42)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("Кошелёк").font(.system(size: 25, weight: .bold, design: .rounded))
                Text("Все счета").font(.subheadline).opacity(0.82)
            }
            Spacer()
            Button { showingList.toggle() } label: {
                Image(systemName: showingList ? "chart.pie.fill" : "magnifyingglass").font(.title3).frame(width: 42, height: 42)
            }
            Image(systemName: "arrow.left.arrow.right").font(.title3).frame(width: 30, height: 42)
            Button { showingMenu = true } label: { Image(systemName: "ellipsis").font(.title2.weight(.bold)).frame(width: 26, height: 42) }
        }
        .padding(.horizontal, 18)
        .frame(height: 88)
        .foregroundStyle(Color.white)
        .background(AppTheme.header.ignoresSafeArea(edges: .top))
    }

    private var periodSelector: some View {
        HStack {
            Button { shiftDate(-1) } label: {
                Text(previousPeriodTitle).font(.title3.weight(.medium)).opacity(0.5)
            }
            Spacer()
            Menu {
                Picker("Период", selection: $period) {
                    ForEach(ReportPeriod.allCases) { Text($0.shortTitle).tag($0) }
                }
            } label: {
                Text(period.title(for: referenceDate)).font(.title2.weight(.medium))
            }
            Spacer()
            Button { shiftDate(1) } label: { Image(systemName: "chevron.right").font(.subheadline.weight(.bold)) }
        }
        .foregroundStyle(AppTheme.accent)
        .padding(.horizontal, 12)
        .frame(height: 52)
    }

    private var summaryLine: some View {
        HStack(spacing: 0) {
            summaryMetric(title: "Доходы", amount: income, color: AppTheme.income, sign: "+")
            Divider().overlay(AppTheme.border).frame(height: 46)
            summaryMetric(title: "Расходы", amount: expenses, color: AppTheme.expense, sign: "−")
        }
        .frame(height: 72)
        .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .padding(.horizontal, 16)
    }

    private func summaryMetric(title: String, amount: Decimal, color: Color, sign: String) -> some View {
        VStack(spacing: 4) {
            Text(title).font(.caption).foregroundStyle(AppTheme.muted)
            Text("\(sign)\(amount.formatted(.currency(code: "RUB")))")
                .font(.subheadline.weight(.bold)).foregroundStyle(color).lineLimit(1).minimumScaleFactor(0.7)
        }.frame(maxWidth: .infinity)
    }

    private func categoryOrbitChart(height: CGFloat) -> some View {
        // Build the view in a single expression so the opaque result type can be inferred
        Group {
            let displayedCategories = Array(categoryTotals.prefix(10))
            ZStack {
                GeometryReader { proxy in
                    let size = min(proxy.size.width * 0.59, min(height * 0.63, 280))
                    let center = CGPoint(x: proxy.size.width / 2, y: height * 0.52)
                    let radius = size * 0.50
                    Canvas { context, _ in
                        for (index, item) in displayedCategories.enumerated() {
                            let angle = orbitAngle(index: index, count: displayedCategories.count)
                            let start = CGPoint(x: center.x + CGFloat(cos(angle)) * radius, y: center.y + CGFloat(sin(angle)) * radius)
                            let end = CGPoint(x: center.x + CGFloat(cos(angle)) * (radius + 64), y: center.y + CGFloat(sin(angle)) * (radius + 64))
                            var path = Path()
                            path.move(to: start)
                            path.addLine(to: end)
                            context.stroke(path, with: .color(AppTheme.chartColor(item.colorIndex)), lineWidth: 1.5)
                        }
                    }
                    .frame(width: proxy.size.width, height: height)

                    if displayedCategories.isEmpty {
                        Circle().stroke(AppTheme.border, lineWidth: 27).frame(width: size, height: size).position(center)
                    } else {
                        Chart(displayedCategories) { category in
                            SectorMark(angle: .value("Расходы", category.amountValue), innerRadius: .ratio(0.62), angularInset: 1.5)
                                .foregroundStyle(AppTheme.chartColor(category.colorIndex))
                        }
                        .chartLegend(.hidden)
                        .frame(width: size, height: size)
                        .position(center)
                    }

                    ForEach(Array(displayedCategories.enumerated()), id: \.element.id) { index, category in
                        let point = orbitPoint(index: index, count: displayedCategories.count, center: center, radius: radius + 98)
                        orbitLabel(category, total: expenses).position(point)
                    }

                    VStack(spacing: 4) {
                        Text(income, format: .currency(code: "RUB")).foregroundStyle(AppTheme.income)
                        Text("−\(expenses.formatted(.currency(code: "RUB")))").foregroundStyle(AppTheme.expense)
                        Text(balance, format: .currency(code: "RUB")).foregroundStyle(AppTheme.balance)
                    }
                    .font(.system(size: max(17, size * 0.098), weight: .bold, design: .rounded))
                    .multilineTextAlignment(.center)
                    .position(center)
                }
                .frame(height: height)
            }
        }
    }

    private func orbitLabel(_ category: CategoryTotal, total: Decimal) -> some View {
        VStack(spacing: 4) {
            Image(systemName: category.symbol)
                .font(.system(size: 27, weight: .regular))
                .foregroundStyle(AppTheme.chartColor(category.colorIndex))
                .frame(width: 42, height: 38)
            if total > 0 {
                Text("\(Int((category.amountValue / NSDecimalNumber(decimal: total).doubleValue * 100).rounded()))%")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(AppTheme.balance)
            }
        }
        .frame(width: 70)
    }

    private var previousPeriodTitle: String {
        guard period != .all else { return "" }
        let component: Calendar.Component = period == .day ? .day : (period == .week ? .weekOfYear : (period == .year ? .year : .month))
        let previous = Calendar.current.date(byAdding: component, value: -1, to: referenceDate) ?? referenceDate
        return period.title(for: previous)
    }

    private var footer: some View {
        VStack(spacing: 18) {
            HStack(spacing: 18) {
                Image(systemName: "line.3.horizontal").font(.title3).foregroundStyle(AppTheme.accent).frame(width: 42)
                balanceButton
                Image(systemName: "line.3.horizontal").font(.title3).foregroundStyle(AppTheme.accent).frame(width: 42)
            }
            HStack {
                Spacer()
                roundAction(symbol: "minus", color: AppTheme.expense, kind: .expense)
                Spacer()
                roundAction(symbol: "plus", color: AppTheme.income, kind: .income)
                Spacer()
            }
        }
        .padding(.horizontal, 14)
        .padding(.top, 6)
        .padding(.bottom, 8)
    }

    private func orbitAngle(index: Int, count: Int) -> Double {
        guard count > 0 else { return 0 }
        return (Double(index) / Double(count)) * .pi * 2 - .pi / 2
    }

    private func orbitPoint(index: Int, count: Int, center: CGPoint, radius: CGFloat) -> CGPoint {
        let angle = orbitAngle(index: index, count: count)
        return CGPoint(x: center.x + CGFloat(cos(angle)) * radius, y: center.y + CGFloat(sin(angle)) * radius)
    }

    private var unusedDonutChart: some View {
        ZStack {
            if categoryTotals.isEmpty {
                Circle().stroke(AppTheme.border, lineWidth: 28).frame(width: 250, height: 250)
            } else {
                Chart(categoryTotals) { category in
                    SectorMark(angle: .value("Расходы", category.amountValue), innerRadius: .ratio(0.64), angularInset: 2)
                        .cornerRadius(5).foregroundStyle(AppTheme.chartColor(category.colorIndex))
                }
                .chartLegend(.hidden)
                .frame(width: 264, height: 264)
            }
            VStack(spacing: 8) {
                Text("ИТОГ ЗА ПЕРИОД").font(.caption2.weight(.bold)).foregroundStyle(AppTheme.muted)
                Text(balance, format: .currency(code: "RUB"))
                    .font(.system(size: 27, weight: .bold, design: .rounded)).foregroundStyle(balance < 0 ? AppTheme.expense : AppTheme.income)
                Text(categoryTotals.isEmpty ? "Добавьте расход" : "Расходы по категориям").font(.caption2).foregroundStyle(AppTheme.muted)
            }.multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, minHeight: 278, maxHeight: 278)
        .padding(.top, 2)
    }

    private var categoryList: some View {
        VStack(spacing: 0) {
            if categoryTotals.isEmpty {
                ContentUnavailableView("Нет расходов", systemImage: "chart.pie", description: Text("Добавьте операцию, чтобы увидеть статистику.")).padding(.vertical, 70)
            } else {
                ForEach(categoryTotals) { category in
                    HStack(spacing: 12) {
                        Image(systemName: category.symbol).foregroundStyle(AppTheme.chartColor(category.colorIndex)).font(.title3).frame(width: 34)
                        Text(category.title).font(.body.weight(.medium))
                        Spacer()
                        Text(category.amount, format: .currency(code: "RUB")).foregroundStyle(AppTheme.expense).font(.body.weight(.semibold))
                    }.padding(.vertical, 14)
                    if category.id != categoryTotals.last?.id { Divider().overlay(AppTheme.border) }
                }
            }
        }
        .padding(.horizontal, 16)
        .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .padding(.horizontal, 16)
    }

    private var balanceButton: some View {
        Button { showingList.toggle() } label: {
            HStack {
                Text("Баланс")
                Spacer()
                Text(balance, format: .currency(code: "RUB"))
            }.font(.title3.weight(.medium)).padding(.horizontal, 16).frame(height: 52)
        }
        .buttonStyle(.plain).foregroundStyle(.white).background(AppTheme.header, in: RoundedRectangle(cornerRadius: 6, style: .continuous))
    }

    private func roundAction(symbol: String, color: Color, kind: EntryKind) -> some View {
        Button { entryKindToAdd = kind } label: {
            Image(systemName: symbol).font(.system(size: 33, weight: .medium)).frame(width: 96, height: 96).overlay(Circle().stroke(color, lineWidth: 6))
        }.buttonStyle(.plain).foregroundStyle(color).accessibilityLabel(kind.title)
    }

    private var menuDrawer: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 8) {
                Image(systemName: "wallet.pass.fill").font(.system(size: 31))
                Text("Мой кошелёк").font(.title2.bold())
                Text("Локальные данные на iPhone").font(.caption).foregroundStyle(AppTheme.muted)
            }.frame(maxWidth: .infinity, alignment: .leading).padding(.top, 60).padding(.horizontal, 24).padding(.bottom, 24)
            Divider().overlay(AppTheme.border)
            drawerButton("Категории", symbol: "square.grid.2x2") { showingCategories = true }
            drawerButton("Счета", symbol: "wallet.pass") { showingAccounts = true }
            drawerButton("Импорт из Monefy", symbol: "square.and.arrow.down") { showingImport = true }
            drawerButton("Настройки", symbol: "gearshape") { showingSettings = true }
            Spacer()
            Text("Данные не передаются в интернет").font(.caption2).foregroundStyle(AppTheme.muted).padding(24)
        }.frame(width: 292).frame(maxHeight: .infinity).background(AppTheme.drawer).foregroundStyle(AppTheme.text).shadow(color: .black.opacity(0.18), radius: 18, x: 7)
    }

    private func drawerButton(_ title: String, symbol: String, action: @escaping () -> Void) -> some View {
        Button {
            closeMenu()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25, execute: action)
        } label: {
            Label(title, systemImage: symbol).font(.body.weight(.medium)).frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 24).padding(.vertical, 18)
        }.buttonStyle(.plain)
    }

    private func shiftDate(_ value: Int) {
        guard period != .all else { return }
        let component: Calendar.Component = period == .day ? .day : (period == .week ? .weekOfYear : (period == .year ? .year : .month))
        referenceDate = Calendar.current.date(byAdding: component, value: value, to: referenceDate) ?? referenceDate
    }
    private func closeMenu() { showingMenu = false }
}

private enum ReportPeriod: String, CaseIterable, Identifiable {
    case day, week, month, year, all
    var id: String { rawValue }
    var shortTitle: String { switch self { case .day: "День"; case .week: "Неделя"; case .month: "Месяц"; case .year: "Год"; case .all: "Все" } }
    func interval(containing date: Date) -> DateInterval? {
        switch self { case .day: Calendar.current.dateInterval(of: .day, for: date); case .week: Calendar.current.dateInterval(of: .weekOfYear, for: date); case .month: Calendar.current.dateInterval(of: .month, for: date); case .year: Calendar.current.dateInterval(of: .year, for: date); case .all: nil }
    }
    func title(for date: Date) -> String {
        switch self { case .day: date.formatted(.dateTime.day().month(.wide)); case .week: "Неделя \(Calendar.current.component(.weekOfYear, from: date))"; case .month: date.formatted(.dateTime.month(.wide)); case .year: date.formatted(.dateTime.year()); case .all: "Все операции" }
    }
}

private struct CategoryTotal: Identifiable {
    let id: String; let title: String; let symbol: String; let amount: Decimal; let colorIndex: Int
    var amountValue: Double { NSDecimalNumber(decimal: amount).doubleValue }
}

private struct AccountsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @Query(sort: \WalletAccount.title) private var accounts: [WalletAccount]
    @Query private var entries: [WalletEntry]
    @State private var showingAdd = false
    var body: some View {
        NavigationStack {
            List {
                ForEach(accounts) { account in
                    HStack { Label(account.title, systemImage: "wallet.pass.fill"); Spacer(); Text(accountBalance(account), format: .currency(code: account.currencyCode)).foregroundStyle(AppTheme.income) }
                }.onDelete { offsets in offsets.map { accounts[$0] }.forEach(context.delete); try? context.save() }
            }.scrollContentBackground(.hidden).background(AppTheme.background).navigationTitle("Счета")
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Готово") { dismiss() } }; ToolbarItem(placement: .topBarTrailing) { Button { showingAdd = true } label: { Image(systemName: "plus") } } }
                .sheet(isPresented: $showingAdd) { AccountEditorView() }
        }
    }
    private func accountBalance(_ account: WalletAccount) -> Decimal { entries.filter { $0.account?.id == account.id }.reduce(account.initialBalance) { $0 + ($1.kind == .income ? $1.amount : -$1.amount) } }
}

private struct AccountEditorView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @State private var title = ""; @State private var currency = "RUB"; @State private var initialBalance = "0"
    var body: some View {
        NavigationStack {
            Form { TextField("Название счёта", text: $title); TextField("Валюта (например, RUB)", text: $currency).textInputAutocapitalization(.characters); TextField("Начальный остаток", text: $initialBalance).keyboardType(.decimalPad) }
                .navigationTitle("Новый счёт")
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Отмена") { dismiss() } }; ToolbarItem(placement: .confirmationAction) { Button("Добавить") { let amount = Decimal(string: initialBalance.replacingOccurrences(of: ",", with: "."), locale: Locale(identifier: "en_US_POSIX")) ?? 0; context.insert(WalletAccount(title: title, currencyCode: currency.uppercased(), initialBalance: amount)); try? context.save(); dismiss() }.disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) } }
        }
    }
}

private struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage("budgetMode") private var budgetMode = false
    @AppStorage("carryBalance") private var carryBalance = true
    @AppStorage("firstWeekday") private var firstWeekday = 2
    @AppStorage("homeCurrency") private var homeCurrency = "RUB"
    let openImport: () -> Void
    var body: some View {
        NavigationStack {
            Form {
                Section("БАЛАНС") { Toggle("Режим бюджета", isOn: $budgetMode); Toggle("Перенос остатка", isOn: $carryBalance) }
                Section("ОБЩИЕ НАСТРОЙКИ") { HStack { Text("Валюта"); Spacer(); TextField("RUB", text: $homeCurrency).multilineTextAlignment(.trailing).textInputAutocapitalization(.characters) }; Picker("Начало недели", selection: $firstWeekday) { Text("Понедельник").tag(2); Text("Воскресенье").tag(1) }; LabeledContent("Хранение") { Text("Только на iPhone").foregroundStyle(AppTheme.income) } }
                Section("РЕЗЕРВНОЕ КОПИРОВАНИЕ") { Button { openImport() } label: { Label("Восстановить из копии Monefy", systemImage: "square.and.arrow.down") }; Text("Облачная синхронизация отключена: данные остаются только на этом iPhone.").font(.caption).foregroundStyle(.secondary) }
            }.navigationTitle("Настройки").toolbar { ToolbarItem(placement: .cancellationAction) { Button("Готово") { dismiss() } } }
        }
    }
}

private enum AppTheme {
    static let background = Color(red: 0.94, green: 0.995, blue: 0.96)
    static let drawer = Color(red: 0.94, green: 0.995, blue: 0.96)
    static let card = Color.white
    static let header = Color(red: 0.47, green: 0.78, blue: 0.59)
    static let accent = Color(red: 0.38, green: 0.73, blue: 0.51)
    static let income = Color(red: 0.33, green: 0.78, blue: 0.49)
    static let expense = Color(red: 0.98, green: 0.49, blue: 0.49)
    static let balance = Color(red: 0.04, green: 0.34, blue: 0.12)
    static let text = Color(red: 0.19, green: 0.30, blue: 0.23)
    static let muted = Color(red: 0.39, green: 0.58, blue: 0.46)
    static let border = Color(red: 0.42, green: 0.72, blue: 0.53).opacity(0.26)
    static func chartColor(_ index: Int) -> Color { [Color(red: 0.31, green: 0.68, blue: 0.94), Color(red: 1.0, green: 0.42, blue: 0.23), Color(red: 0.91, green: 0.42, blue: 0.66), Color(red: 0.96, green: 0.77, blue: 0.05), Color(red: 0.65, green: 0.44, blue: 0.88)][index % 5] }
}
