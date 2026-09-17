import { useEffect, useRef, useState } from 'react';

// Anima un numero suavemente hacia "valorObjetivo" cada vez que cambia, en vez de
// saltarlo de golpe: interpola cuadro a cuadro (mas seguido que una vez por
// segundo) desde el ultimo valor mostrado hasta el nuevo. Devuelve tambien la
// direccion del ultimo cambio real ('sube' | 'baja' | null) para poder pintarlo,
// que se mantiene un rato despues de terminar la animacion para que el color
// llegue a verse. No inventa valores intermedios reales: solo suaviza la
// transicion entre dos valores que sí vinieron del backend.
export function useValorAnimado(valorObjetivo, duracionMs = 900, sostenerColorMs = 900) {
    const [valorMostrado, setValorMostrado] = useState(valorObjetivo);
    const [direccion, setDireccion] = useState(null);
    const valorMostradoRef = useRef(valorObjetivo);
    const objetivoAnteriorRef = useRef(valorObjetivo);

    useEffect(() => {
        if (valorObjetivo == null || Number.isNaN(valorObjetivo)) return;
        if (valorObjetivo === objetivoAnteriorRef.current) return;

        const desde = valorMostradoRef.current;
        const hasta = valorObjetivo;
        objetivoAnteriorRef.current = hasta;
        setDireccion(hasta > desde ? 'sube' : 'baja');

        const inicio = performance.now();
        let frame;
        let timeoutColor;

        function tick(ahora) {
            const progreso = Math.min((ahora - inicio) / duracionMs, 1);
            const facil = 1 - Math.pow(1 - progreso, 3);
            const nuevoValor = desde + (hasta - desde) * facil;
            valorMostradoRef.current = nuevoValor;
            setValorMostrado(nuevoValor);
            if (progreso < 1) {
                frame = requestAnimationFrame(tick);
            } else {
                timeoutColor = setTimeout(() => setDireccion(null), sostenerColorMs);
            }
        }
        frame = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(frame);
            clearTimeout(timeoutColor);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [valorObjetivo, duracionMs]);

    return [valorMostrado, direccion];
}
