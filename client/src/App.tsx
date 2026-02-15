import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Beneficios from './components/Beneficios';
import Products from './components/Products';
import ContactForm from './components/ContactForm';
import Footer from './components/Footer';

export default function App() {
  return (
    <>
      <Navbar links={[
        { label: "Inicio", href: "#inicio" },
        { label: "Beneficios", href: "#beneficios" },
        { label: "Productos", href: "#productos" },
        { label: "Contacto", href: "#contacto" }
      ]} />
      
      <main>
        <Hero description="Captamos y gestionamos leads de forma automática. Vende más, atiende mejor y escala sin esfuerzo." />
        <Beneficios />
        <Products />
        <ContactForm />
      </main>
      
      <Footer />
    </>
  );
}
