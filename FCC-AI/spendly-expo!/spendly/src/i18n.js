// RU is the source language. tr(ru, en, fr?) — French comes from FR (keyed by the English text) unless passed explicitly.
let lang = 'ru';
export const setLang = (l) => { lang = l; };
export const getLang = () => lang;
export const loc = () => (lang === 'en' ? 'en-GB' : lang === 'fr' ? 'fr-FR' : 'ru-RU');
export const tr = (r, e, f) => (lang === 'en' ? e : lang === 'fr' ? (f || FR[e] || e) : r);

const FR = {
  'Restore': 'Restaurer', 'Categories are tiles under the chart. Tap a category or a colored segment to open its history. The Expense and Income buttons open entry in three steps: note, amount, category.': 'Les catégories sont des tuiles sous le graphique. Touchez une catégorie ou un segment coloré pour ouvrir son historique. Les boutons Dépense et Revenus ouvrent la saisie en trois étapes : note, montant, catégorie.', 'No spending': 'Sans dépenses', 'Notes': 'Notes', 'Bulk note editing': 'Modification groupée des notes', 'The ✎ button when selecting transactions in History': 'Le bouton ✎ lors de la sélection d’opérations dans l’historique', 'Categories sit around the chart, each with a line to its own segment. Tap a category or a segment to open its history. The Expense and Income buttons open entry in three steps: note, amount, category.': 'Les catégories entourent le graphique, chacune reliée à son segment. Touchez une catégorie ou un segment pour ouvrir son historique. Les boutons Dépense et Revenus ouvrent la saisie en trois étapes : note, montant, catégorie.', 'Rename note': 'Modifier la note', 'New note': 'Nouvelle note', 'All time': 'Toute la période', 'Transaction': 'Opération', 'Transaction deleted': 'Opération supprimée', 'Delete this transaction?': 'Supprimer cette opération ?', 'Add': 'Ajouter', 'Tap a total to show only expenses or income': 'Touchez un total pour n’afficher que les dépenses ou les revenus', 'operations': 'opérations', 'Cancel': 'Annuler', 'Save': 'Enregistrer', 'Back': 'Retour', 'Delete': 'Supprimer', 'Done': 'OK',
  'Income': 'Revenus', 'Expense': 'Dépense', 'Expenses': 'Dépenses', 'Balance': 'Solde', 'history': 'historique',
  'Note': 'Note', 'Amount': 'Montant', 'Category': 'Catégorie', 'Next': 'Suivant', 'Skip': 'Passer',
  'What is it for? (optional)': 'C’est pour quoi ? (facultatif)', 'Date': 'Date',
  'Days': 'Jours', 'Weeks': 'Semaines', 'Months': 'Mois', 'Years': 'Années', 'Period': 'Période', 'now': 'actuel',
  'Custom range': 'Période libre', 'From': 'Du', 'To': 'Au', 'Apply': 'Afficher',
  'All': 'Tout', 'Select': 'Sélectionner', 'selected': 'sélectionné(s)', 'Move': 'Déplacer',
  'Undo': 'Annuler', 'Deleted': 'Supprimé', 'Moved to': 'Déplacé vers',
  'No transactions in this period. Add one or import your Monefy history.': 'Aucune opération sur cette période. Ajoutez-en une ou importez votre historique Monefy.',
  'Move to category': 'Déplacer vers la catégorie', 'Selected': 'Sélection',
  'Search': 'Rechercher', 'Search: category, note, amount': 'Recherche : catégorie, note, montant',
  'Start typing: search covers all transactions of all time, from the first letter.': 'Commencez à saisir : la recherche couvre toutes les opérations, dès la première lettre.',
  'Nothing found': 'Aucun résultat', 'Found': 'Trouvé', 'Showing the first 300 results. Refine your search.': 'Les 300 premiers résultats sont affichés. Affinez votre recherche.',
  'Menu': 'Menu', 'Import data': 'Importer des données', 'Icons & categories': 'Icônes et catégories', 'Guide': 'Guide', 'Settings': 'Réglages',
  'In Monefy open settings and export to CSV, then choose the file here. Negative amounts are expenses, unknown categories are created automatically, duplicates are skipped.': 'Dans Monefy, ouvrez les réglages et exportez en CSV, puis choisissez le fichier ici. Les montants négatifs sont des dépenses, les catégories inconnues sont créées automatiquement et les doublons ignorés.',
  'Choose CSV file': 'Choisir un fichier CSV', 'Added': 'Ajouté', 'Duplicates skipped': 'Doublons ignorés', 'Rows with errors': 'Lignes en erreur',
  'Could not read the file': 'Impossible de lire le fichier', 'The file is empty or is not a Monefy CSV export': 'Le fichier est vide ou n’est pas un export CSV de Monefy',
  'Name': 'Nom', 'This category already exists': 'Cette catégorie existe déjà', 'Icon': 'Icône', 'Or type your own emoji': 'Ou saisissez votre emoji', 'Color': 'Couleur',
  'Delete category': 'Supprimer la catégorie', 'Transactions stay in history with a gray icon.': 'Les opérations restent dans l’historique avec une icône grise.', 'Add category': 'Ajouter une catégorie',
  'Delete this category?': 'Supprimer cette catégorie ?',
  'Wrong passcode': 'Code incorrect', 'Enter passcode': 'Saisissez le code', 'Use Face ID': 'Utiliser Face ID',
  'Passcode': 'Code d’accès', '4–6 digits. This keeps casual viewers out; it does not encrypt your data.': '4 à 6 chiffres. Cela écarte les curieux mais ne chiffre pas vos données.',
  'Theme': 'Thème', 'Auto': 'Auto', 'Light': 'Clair', 'Dark': 'Sombre', 'Language': 'Langue', 'Currency': 'Devise',
  'Week starts on': 'La semaine commence le', 'Mon': 'Lun', 'Sun': 'Dim', 'Sat': 'Sam', 'Month starts on day': 'Le mois commence le (jour)',
  'Set passcode': 'Définir un code', 'Change passcode': 'Modifier le code', 'Turn off passcode': 'Désactiver le code', 'Face ID / Touch ID': 'Face ID / Touch ID',
  'Data': 'Données', 'Export all data (JSON)': 'Exporter toutes les données (JSON)', 'Create in-app backup': 'Créer une sauvegarde dans l’app',
  'Restore from in-app backup': 'Restaurer la sauvegarde de l’app', 'Restore from file': 'Restaurer depuis un fichier', 'Delete all data': 'Supprimer toutes les données',
  'Backup created': 'Sauvegarde créée', 'Restored from backup': 'Données restaurées depuis la sauvegarde', 'Restored transactions:': 'Opérations restaurées :',
  'This is not a Spendly backup file': 'Ce fichier n’est pas une sauvegarde Spendly', 'Could not share the file': 'Impossible de partager le fichier',
  'All data deleted': 'Toutes les données ont été supprimées', 'Last backup:': 'Dernière sauvegarde :', 'Restore data from this backup?': 'Restaurer les données depuis cette sauvegarde ?',
  'Delete all data?': 'Supprimer toutes les données ?', 'Save a backup file first': 'Enregistrer d’abord un fichier de sauvegarde', 'Continue': 'Continuer',
  'Last step. Type the word': 'Dernière étape. Saisissez le mot', 'to confirm.': 'pour confirmer.', 'Delete forever': 'Supprimer définitivement', 'DELETE': 'SUPPRIMER',
  'Home': 'Accueil', 'History': 'Historique', 'Import': 'Import', 'Categories': 'Catégories',
  'The Expense and Income buttons open entry in three steps: note, amount, category. Tapping a category on the home screen preselects it.': 'Les boutons Dépense et Revenus ouvrent la saisie en trois étapes : note, montant, catégorie. Toucher une catégorie sur l’accueil la présélectionne.',
  'Tap the balance amount in the center of the chart to open history. Press and hold a transaction to select several, then Move or Delete.': 'Touchez le solde au centre du graphique pour ouvrir l’historique. Maintenez une opération pour en sélectionner plusieurs, puis Déplacer ou Supprimer.',
  'The date button at the top left: days, weeks, months, years or a custom From–To range.': 'Le bouton de date en haut à gauche : jours, semaines, mois, années ou une période libre du … au ….',
  'The magnifier at the top right searches all transactions from the first letter.': 'La loupe en haut à droite recherche dans toutes les opérations dès la première lettre.',
  'Menu → Import data: upload a CSV from Monefy; duplicates are skipped.': 'Menu → Importer des données : chargez un CSV de Monefy ; les doublons sont ignorés.',
  'Menu → Icons & categories: add, edit or delete categories.': 'Menu → Icônes et catégories : ajoutez, modifiez ou supprimez des catégories.',
  'Theme, language, currency, week and month start, passcode and Face ID, export and backups.': 'Thème, langue, devise, début de semaine et de mois, code et Face ID, export et sauvegardes.',
};
