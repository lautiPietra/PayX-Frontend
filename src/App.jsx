import { Routes, Route, Navigate } from 'react-router-dom';
import Splash from './pages/Splash';
import Home from './pages/Home';
import Registro from './pages/Registro';
import Verificacion from './pages/Verificacion';
import Login from './pages/Login';
import OlvidePassword from './pages/OlvidePassword';
import VerificarCodigoReset from './pages/VerificarCodigoReset';
import NuevaPassword from './pages/NuevaPassword';
import Perfil from './pages/Perfil';
import AdminPanel from './pages/AdminPanel';
import { estaLogueado, esAdmin } from './services/authService';
import AltaPlantilla from "./pages/AltaPlantilla";
import EditarPlantilla from "./pages/EditarPlantilla";
import BajaPlantilla from "./pages/BajaPlantilla";
import ListadoPlantillas from "./pages/ListadoPlantillas";

function RutaPrivada({ children }) {
    return estaLogueado() ? children : <Navigate to="/login" />;
}

function RutaAdmin({ children }) {
    if (!estaLogueado()) return <Navigate to="/login" />;
    if (!esAdmin()) return <Navigate to="/inicio" />;
    return children;
}

function App() {
    return (
        <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/verificacion" element={<Verificacion />} />
            <Route path="/olvide-password" element={<OlvidePassword />} />
            <Route path="/verificar-codigo-reset" element={<VerificarCodigoReset />} />
            <Route path="/nueva-password" element={<NuevaPassword />} />

            <Route path="/inicio" element={<RutaPrivada><Home /></RutaPrivada>} />
            <Route path="/perfil" element={<RutaPrivada><Perfil /></RutaPrivada>} />
            <Route path="/admin" element={<RutaAdmin><AdminPanel /></RutaAdmin>} />
            <Route path="/admin/plantillas/nueva" element={<RutaAdmin><AltaPlantilla /></RutaAdmin>} />
            <Route path="/admin/plantillas/:id/editar" element={<RutaAdmin><EditarPlantilla /></RutaAdmin>} />
            <Route path="/admin/plantillas/:id/baja" element={<RutaAdmin><BajaPlantilla /></RutaAdmin>} />
            <Route path="/admin/plantillas" element={<RutaAdmin><ListadoPlantillas /></RutaAdmin>} />
        </Routes>
    );
}

export default App;