export const translations = {
  es: {
    nav: {
      inicio: "Inicio",
      beneficios: "Beneficios",
      productos: "Productos",
      contacto: "Contacto",
      menuTitle: "Navegación"
    },
    hero: {
      badge: "Automatización Inteligente",
      title: "Potencia tu Negocio con",
      highlight: "Inteligencia Artificial",
      description: "Captamos y gestionamos leads de forma automática. Vende más, atiende mejor y escala sin esfuerzo.",
      ctaPrimary: "Explorar Productos",
      ctaSecondary: "Contáctanos",
      indicator1: "24/7",
      indicator1Label: "Atención Automática",
      indicator2: "+300%",
      indicator2Label: "Más Conversiones",
      indicator3: "0",
      indicator3Label: "Costos Ocultos"
    },
    beneficios: {
      title: "¿Por qué elegirnos?",
      benefit1: {
        title: "Automatización Completa",
        description: "Elimina tareas repetitivas y enfócate en cerrar ventas. Nuestro sistema trabaja por ti."
      },
      benefit2: {
        title: "Respuesta Inmediata",
        description: "Atiende leads al instante, 24/7. Nunca pierdas una oportunidad de venta."
      },
      benefit3: {
        title: "Escalabilidad Total",
        description: "Crece sin límites. Nuestra tecnología se adapta al tamaño de tu negocio."
      }
    },
    productos: {
      title: "Nuestros Productos",
      subtitle: "Soluciones profesionales adaptadas a tu negocio",
      verPlanes: "Ver Planes",
      comenzarAhora: "Comenzar Ahora",
      ahorro: "Ahorra 20%",
      idealPara: "Ideal para:"
    },
    contacto: {
      title: "¿Listo para dar el siguiente paso?",
      subtitle: "Déjanos tus datos y un asesor te contactará en menos de 24 horas",
      nombre: "Nombre completo",
      email: "Email",
      telefono: "Teléfono",
      mensaje: "Mensaje",
      enviar: "Enviar mensaje",
      enviando: "Enviando...",
      success: "¡Enviado con éxito!",
      successMsg: "Te contactaremos muy pronto.",
      error: "Error al enviar"
    },
    footer: {
      description: "Automatización inteligente de ventas con IA. Transforma tu negocio con soluciones que escalan.",
      productos: "Productos",
      empresa: "Empresa",
      soporte: "Soporte",
      copyright: "Todos los derechos reservados.",
      tagline: "Hecho con IA para potenciar tu negocio"
    }
  },
  en: {
    nav: {
      inicio: "Home",
      beneficios: "Benefits",
      productos: "Products",
      contacto: "Contact",
      menuTitle: "Navigation"
    },
    hero: {
      badge: "Intelligent Automation",
      title: "Boost Your Business with",
      highlight: "Artificial Intelligence",
      description: "We capture and manage leads automatically. Sell more, serve better, and scale effortlessly.",
      ctaPrimary: "Explore Products",
      ctaSecondary: "Contact Us",
      indicator1: "24/7",
      indicator1Label: "Automatic Support",
      indicator2: "+300%",
      indicator2Label: "More Conversions",
      indicator3: "0",
      indicator3Label: "Hidden Costs"
    },
    beneficios: {
      title: "Why Choose Us?",
      benefit1: {
        title: "Complete Automation",
        description: "Eliminate repetitive tasks and focus on closing sales. Our system works for you."
      },
      benefit2: {
        title: "Instant Response",
        description: "Attend leads instantly, 24/7. Never miss a sales opportunity."
      },
      benefit3: {
        title: "Total Scalability",
        description: "Grow without limits. Our technology adapts to your business size."
      }
    },
    productos: {
      title: "Our Products",
      subtitle: "Professional solutions tailored to your business",
      verPlanes: "View Plans",
      comenzarAhora: "Get Started",
      ahorro: "Save 20%",
      idealPara: "Ideal for:"
    },
    contacto: {
      title: "Ready to take the next step?",
      subtitle: "Leave your details and an advisor will contact you within 24 hours",
      nombre: "Full Name",
      email: "Email",
      telefono: "Phone",
      mensaje: "Message",
      enviar: "Send message",
      enviando: "Sending...",
      success: "Sent successfully!",
      successMsg: "We will contact you soon.",
      error: "Error sending"
    },
    footer: {
      description: "Intelligent sales automation with AI. Transform your business with solutions that scale.",
      productos: "Products",
      empresa: "Company",
      soporte: "Support",
      copyright: "All rights reserved.",
      tagline: "Made with AI to boost your business"
    }
  }
};

export type Language = 'es' | 'en';
export type TranslationKey = keyof typeof translations.es;

export function getBrowserLanguage(): Language {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('en')) return 'en';
  return 'es';
}
