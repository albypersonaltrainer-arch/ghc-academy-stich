export const ACADEMY_CONFIG = {
  brand: {
    name: "GHC ACADEMY",
    slogan: "SPORT THROUGH SCIENCE",
    primaryColor: "var(--brand-color)", 
  },
  i18n: {
    defaultLocale: "es",
    locales: ["es", "en"],
    translations: {
      es: {
        heroTitle: "EL DEPORTE A TRAVÉS DE LA CIENCIA",
        heroSub: "Protocolos avanzados de integración biológica para la optimización humana.",
        explore: "EXPLORAR PROTOCOLOS",
        portalLogin: "ACCESO PORTAL",
        categories: {
          elite: "Deporte Élite",
          lesions: "Lesiones / Patologías",
          tech: "Tecnificación / Datos",
          personal: "Entrenamiento Personal",
          nutrition: "Nutrición / Salud"
        }
      },
      en: {
        heroTitle: "SPORT THROUGH SCIENCE",
        heroSub: "Advanced biological integration protocols for human optimization.",
        explore: "EXPLORE PROTOCOLS",
        portalLogin: "PORTAL ACCESS",
        categories: {
          elite: "Elite Sport",
          lesions: "Injuries / Pathologies",
          tech: "Data & Technique",
          personal: "Personal Training",
          nutrition: "Nutrition / Health"
        }
      }
    }
  },
  taxonomy: [
    {
      id: "cat_01",
      slug: "deporte-elite",
      name: "Deporte Élite",
      subgroups: [
        {
          id: "sub_01_01",
          name: "Alto Rendimiento",
          courses: [
            { id: "c_01", title: "Optimización Biomecánica", type: "VIDEO", price: 299, duration: "45:00" },
            { id: "c_02", title: "Neuro-fisiología del Esfuerzo", type: "AUDIO", price: 150, duration: "12:30" }
          ]
        }
      ]
    },
    {
      id: "cat_05",
      slug: "nutricion-salud",
      name: "Nutrición / Salud",
      subgroups: [
        {
          id: "sub_05_01",
          name: "Farmacología",
          courses: [
            { id: "c_03", title: "Ciclos y Rendimiento", type: "DOCUMENT", price: 450, pages: 120 },
            { id: "c_04", title: "Suplementación Avanzada", type: "VIDEO", price: 199, duration: "60:00" }
          ]
        }
      ]
    }
  ],
  security: {
    dynamicWatermark: true,
    sessionLock: true,
    secretAdminParam: "ghc_secure_access_2024",
    contentProtection: {
      disableRightClick: true,
      preventCapture: true
    }
  }
};
