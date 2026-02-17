import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Beneficios from './components/Beneficios';
import Products from './components/Products';
import ContactForm from './components/ContactForm';
import Footer from './components/Footer';
import Animation3D from './components/Animation3D';
import WhatsAppButton from './components/WhatsAppButton';
import { I18nProvider, useI18n } from './I18nContext';

function AppContent() {
  const { t, language, setLanguage } = useI18n();

  return (
    <>
      <Navbar 
        language={language}
        onLanguageChange={setLanguage}
        menuTitle={t.nav.menuTitle}
        links={[
          { label: t.nav.inicio, href: "#inicio" },
          { label: t.nav.beneficios, href: "#beneficios" },
          { label: t.nav.productos, href: "#productos" },
          { label: t.nav.contacto, href: "#contacto" }
        ]} 
      />
      
      <main className="w-full">
        <Hero 
          badge={t.hero.badge}
          title={t.hero.title}
          highlight={t.hero.highlight}
          description={t.hero.description}
          primaryCTA={{ text: t.hero.ctaPrimary, href: "#productos" }}
          secondaryCTA={{ text: t.hero.ctaSecondary, href: "#contacto" }}
          indicators={[
            { value: t.hero.indicator1, label: t.hero.indicator1Label },
            { value: t.hero.indicator2, label: t.hero.indicator2Label },
            { value: t.hero.indicator3, label: t.hero.indicator3Label }
          ]}
        />
        <Beneficios 
          title={t.beneficios.title}
          benefits={[
            { icon: `<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>`, title: t.beneficios.benefit1.title, description: t.beneficios.benefit1.description },
            { icon: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`, title: t.beneficios.benefit2.title, description: t.beneficios.benefit2.description },
            { icon: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`, title: t.beneficios.benefit3.title, description: t.beneficios.benefit3.description }
          ]}
        />
        <Products />
        <ContactForm 
          title={t.contacto.title}
          subtitle={t.contacto.subtitle}
          labels={{
            nombre: t.contacto.nombre,
            email: t.contacto.email,
            telefono: t.contacto.telefono,
            mensaje: t.contacto.mensaje,
            enviar: t.contacto.enviar,
            enviando: t.contacto.enviando
          }}
        />
      </main>
      
      <Footer 
        description={t.footer.description}
        links={{
          productos: t.footer.productos,
          empresa: t.footer.empresa,
          soporte: t.footer.soporte
        }}
        copyright={t.footer.copyright}
        tagline={t.footer.tagline}
      />
      <WhatsAppButton />
      <Animation3D />
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
