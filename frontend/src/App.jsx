import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";

// Produtos
import Cadastrar from "./pages/produtos/Cadastrar";
import Listar from "./pages/produtos/Listar";

// Postagens
import Historico from "./pages/postagens/Historico";
import LayoutPost from "./pages/postagens/Layout";

function App() {
  return (
    <BrowserRouter>
      <div className="flex">
        <Sidebar />

        {/* Conteúdo principal */}
        <main className="ps-6 pt-6 pe-2 w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />

            {/* PRODUTOS */}
            <Route path="/produtos/cadastrar" element={<Cadastrar />} />
            <Route path="/produtos/listar" element={<Listar />} />

            {/* POSTAGENS */}
            <Route path="/postagens/historico" element={<Historico />} />
            <Route path="/postagens/layout" element={<LayoutPost />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
