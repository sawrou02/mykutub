import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const fr = {
  nav: {
    home: "Accueil", catalog: "Catalogue", howItWorks: "Comment ça marche",
    about: "À propos", faq: "FAQ", contact: "Contact",
    publish: "Publier", login: "Connexion", signup: "S'inscrire",
    account: "Mon compte", messages: "Messages", profile: "Profil",
  },
  common: {
    loading: "Chargement...", search: "Rechercher", cancel: "Annuler",
    save: "Enregistrer", delete: "Supprimer", share: "Partager",
    free: "GRATUIT", reviews: "Avis", rating: "Note", noReviews: "Aucun avis",
    leaveReview: "Laisser un avis", yourRating: "Votre note", comment: "Commentaire",
    submit: "Envoyer", linkCopied: "Lien copié !",
    delivery: "Livraison possible", noDelivery: "Retrait uniquement",
    history: "Historique", clearHistory: "Effacer l'historique",
    recentSearches: "Recherches récentes",
  },
  publish: {
    canDeliver: "Je peux livrer ce livre",
    canDeliverHint: "Cochez si vous proposez la livraison à l'acheteur.",
  },
  catalog: {
    title: "Catalogue", subtitle: "Tous les livres disponibles dans la communauté.",
    placeholder: "Livre, auteur...", allFrance: "Toute la France",
  },
};

const en = {
  nav: {
    home: "Home", catalog: "Catalog", howItWorks: "How it works",
    about: "About", faq: "FAQ", contact: "Contact",
    publish: "Publish", login: "Login", signup: "Sign up",
    account: "My account", messages: "Messages", profile: "Profile",
  },
  common: {
    loading: "Loading...", search: "Search", cancel: "Cancel",
    save: "Save", delete: "Delete", share: "Share",
    free: "FREE", reviews: "Reviews", rating: "Rating", noReviews: "No reviews yet",
    leaveReview: "Leave a review", yourRating: "Your rating", comment: "Comment",
    submit: "Submit", linkCopied: "Link copied!",
    delivery: "Delivery available", noDelivery: "Pickup only",
    history: "History", clearHistory: "Clear history",
    recentSearches: "Recent searches",
  },
  publish: {
    canDeliver: "I can deliver this book",
    canDeliverHint: "Check if you offer delivery to the buyer.",
  },
  catalog: {
    title: "Catalog", subtitle: "All books available in the community.",
    placeholder: "Book, author...", allFrance: "All France",
  },
};

const ar = {
  nav: {
    home: "الرئيسية", catalog: "الكتالوج", howItWorks: "كيف يعمل",
    about: "حول", faq: "الأسئلة الشائعة", contact: "اتصل بنا",
    publish: "نشر", login: "تسجيل الدخول", signup: "إنشاء حساب",
    account: "حسابي", messages: "الرسائل", profile: "الملف الشخصي",
  },
  common: {
    loading: "جار التحميل...", search: "بحث", cancel: "إلغاء",
    save: "حفظ", delete: "حذف", share: "مشاركة",
    free: "مجاني", reviews: "التقييمات", rating: "التقييم", noReviews: "لا توجد تقييمات",
    leaveReview: "اترك تقييمًا", yourRating: "تقييمك", comment: "تعليق",
    submit: "إرسال", linkCopied: "تم نسخ الرابط!",
    delivery: "التوصيل متاح", noDelivery: "الاستلام فقط",
    history: "السجل", clearHistory: "مسح السجل",
    recentSearches: "عمليات البحث الأخيرة",
  },
  publish: {
    canDeliver: "يمكنني توصيل هذا الكتاب",
    canDeliverHint: "حدد إذا كنت تقدم التوصيل للمشتري.",
  },
  catalog: {
    title: "الكتالوج", subtitle: "جميع الكتب المتاحة في المجتمع.",
    placeholder: "كتاب، مؤلف...", allFrance: "كل فرنسا",
  },
};

if (!i18n.isInitialized) {
  i18n.use(LanguageDetector).use(initReactI18next).init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: "fr",
    supportedLngs: ["fr", "en", "ar"],
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage", "navigator"], caches: ["localStorage"] },
  });
}

export const RTL_LANGS = ["ar"];
export function applyDirection(lng: string) {
  if (typeof document === "undefined") return;
  const dir = RTL_LANGS.includes(lng) ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
}

i18n.on("languageChanged", applyDirection);

export default i18n;
