import { useEffect, useRef, useState } from 'react';

// Diferencia minima para considerar que el precio "realmente" cambio. Sin esto, una recotizacion
// que vuelve con el mismo valor pero con un redondeo de punto flotante distinto (ej. 61234.000000001
// en vez de 61234) disparaba igual el flash de color: un parpadeo de verde o rojo sin que el precio
// se haya movido de verdad.
const DIFERENCIA_MINIMA = 0.005;

// Anima un numero suavemente hacia "valorObjetivo" cada vez que cambia, en vez de
// saltarlo de golpe: interpola cuadro a cuadro (mas seguido que una vez por
// segundo) desde el ultimo valor mostrado hasta el nuevo. Devuelve tambien la
// direccion del ultimo cambio real ('sube' | 'baja' | null) para poder pintarlo,
// que se mantiene un rato despues de terminar la animacion para que el color
// llegue a verse (2 a 3 segundos por default, para que de tiempo a notarlo). El
// color mismo entra con una transicion CSS (ver *.css de cada ticker), nunca de
// golpe. No inventa valores intermedios reales: solo suaviza la transicion entre
// dos valores que sí vinieron del backend.
export function useValorAnimado(valorObjetivo, duracionMs = 900, sostenerColorMs = 2500) {
    const [valorMostrado, setValorMostrado] = useState(valorObjetivo);
    const [direccion, setDireccion] = useState(null);
    const valorMostradoRef = useRef(valorObjetivo);
    const objetivoAnteriorRef = useRef(valorObjetivo);

    useEffect(() => {
        if (valorObjetivo == null || Number.isNaN(valorObjetivo)) return;
        if (Math.abs(valorObjetivo - objetivoAnteriorRef.current) < DIFERENCIA_MINIMA) return;

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
