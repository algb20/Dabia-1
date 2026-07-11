/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // لا يوجد إعداد ESLint في المشروع؛ تركه متجاهَلاً يتجنّب إضافة اعتماديات
    // غير ضرورية أثناء البناء دون أي تأثير فعلي.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // فحص الأنواع مُفعَّل في البناء: أي خطأ TypeScript يوقف البناء بدل أن
    // يُشحن بصمت إلى الإنتاج (كان سابقاً true فيخفي أخطاء حقيقية).
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
