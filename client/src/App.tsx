import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Beneficios from './components/Beneficios';
import Products from './components/Products';
import ContactForm from './components/ContactForm';
import Footer from './components/Footer';
import Animation3D from './components/Animation3D';

export default function App() {
  return (
    <>
      <Navbar links={[
        { label: "Inicio", href: "#inicio" },
        { label: "Beneficios", href: "#beneficios" },
        { label: "Productos", href: "#productos" },
        { label: "Contacto", href: "#contacto" }
      ]} />
      
      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <Hero description="Captamos y gestionamos leads de forma automática. Vende más, atiende mejor y escala sin esfuerzo." />
        <Beneficios />
        <Products />
        <ContactForm />
      </main>
      
      <Footer />
      <Animation3D />
    </>
  );
}
