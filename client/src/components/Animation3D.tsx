import { useEffect, useRef, useState } from 'react';

export default function Animation3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let cleanup: (() => void) | undefined;

    const init = async () => {
      try {
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

        const container = containerRef.current!;
        
        const scene = new THREE.Scene();
        
        const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.25, 100);
        camera.position.set(-5, 3, 10);
        camera.lookAt(0, 1, 0);

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setClearColor(0x000000, 0);
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 1);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 5, 5);
        scene.add(dirLight);

        let mixer: any = null;
        let model: any = null;
        const clock = new THREE.Clock();

        const loader = new GLTFLoader();
        loader.load(
          '/RobotExpressive.glb',
          (gltf: any) => {
            model = gltf.scene;
            scene.add(model);

            mixer = new THREE.AnimationMixer(model);
            const animations = gltf.animations;
            if (animations?.length > 0) {
              const walkingClip = animations.find((clip: any) => clip.name === 'Walking');
              const action = mixer.clipAction(walkingClip || animations[0]);
              action.play();
            }

            setLoaded(true);
          },
          undefined,
          (error: any) => {
            console.error('Error loading model:', error);
          }
        );

        function animate() {
          requestAnimationFrame(animate);
          const delta = clock.getDelta();
          if (mixer) mixer.update(delta);
          if (model) model.rotation.y += 0.01;
          renderer.render(scene, camera);
        }

        animate();

        const handleScroll = () => {
          if (!model) return;
          const scrollProgress = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
          model.position.y = Math.sin(scrollProgress * Math.PI * 4) * 0.15;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        const handleResize = () => {
          camera.aspect = container.clientWidth / container.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(container.clientWidth, container.clientHeight);
        };

        window.addEventListener('resize', handleResize, { passive: true });

        cleanup = () => {
          window.removeEventListener('scroll', handleScroll);
          window.removeEventListener('resize', handleResize);
          renderer.dispose();
          container.innerHTML = '';
        };
      } catch (error) {
        console.error('Error initializing Three.js:', error);
      }
    };

    init();

    return () => {
      cleanup?.();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`fixed bottom-8 right-8 w-[350px] h-[400px] pointer-events-none z-30 transition-opacity duration-500 hidden xl:block overflow-hidden ${loaded ? 'opacity-100' : 'opacity-0'}`}
      id="snakeFollower3D"
    />
  );
}
