// حقول بطاقة الهوية الإضافية بحسب نوع الحساب — تُخزَّن داخل profile.identity_card
// (حقل JSON مرن موجود فعلاً في جدول users، لا حاجة لتعديل قاعدة البيانات).
// هذا الملف هو المرجع الوحيد لهذه الحقول — تستخدمه صفحة تعديل الملف الشخصي
// (للتعبئة) وصفحة المتجر العامة (للعرض) معاً، لضمان تطابقهما دائماً.

export interface IdentityField {
  key: string
  label: string
  placeholder: string
  // إن وُجد، يُعرض كقائمة Tags (مفصولة بفواصل) بدل نص عادي
  isList?: boolean
}

export type AccountRole = "buyer" | "merchant" | "agent" | "service_provider" | "company" | "factory" | "partner"

export const IDENTITY_CARD_FIELDS: Record<AccountRole, IdentityField[]> = {
  buyer: [],

  merchant: [
    { key: "specialties", label: "What you sell",     placeholder: "Electronics, Handmade jewelry, Home decor", isList: true },
    { key: "ships_from",  label: "Ships from",          placeholder: "Cairo, Egypt" },
  ],

  agent: [
    { key: "represents",    label: "Represents / Brands", placeholder: "NovaTech, SportFlow Inc", isList: true },
    { key: "coverage_area", label: "Coverage area",       placeholder: "GCC region, North Africa" },
  ],

  service_provider: [
    { key: "services_offered", label: "Services offered", placeholder: "Web design, Logistics, Consulting", isList: true },
    { key: "coverage_area",    label: "Service area",     placeholder: "Remote / Worldwide, or a specific city" },
    { key: "response_time",    label: "Typical response time", placeholder: "Within 24 hours" },
  ],

  company: [
    { key: "registration_number", label: "Registration number", placeholder: "Official company registration #" },
    { key: "founded_year",        label: "Founded",              placeholder: "2019" },
    { key: "team_size",           label: "Team size",            placeholder: "11–50" },
    { key: "industry",            label: "Industry",             placeholder: "Logistics, Software, Retail" },
  ],

  factory: [
    { key: "founded_year",         label: "Founded",              placeholder: "2015" },
    { key: "production_capacity",  label: "Production capacity",  placeholder: "10,000 units / month" },
    { key: "certifications",       label: "Certifications",       placeholder: "ISO 9001, HACCP", isList: true },
    { key: "industry",             label: "Industry",              placeholder: "Textiles, Food processing" },
  ],

  partner: [
    { key: "partnership_type", label: "Partnership type", placeholder: "Distribution, Logistics, Co-marketing" },
    { key: "founded_year",     label: "Founded",           placeholder: "2020" },
  ],
}

export function getIdentityFields(role?: string): IdentityField[] {
  return IDENTITY_CARD_FIELDS[(role as AccountRole) ?? "buyer"] ?? []
}
