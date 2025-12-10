import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Package,
    ChevronDown,
    ChevronRight,
    Images,
} from "lucide-react";

export default function Sidebar() {
    const [openMenu, setOpenMenu] = useState(null);
    const [openPost, setOpenPost] = useState(null);

    const toggleMenu = (menu) => {
        setOpenMenu(openMenu === menu ? null : menu);
    };

    const togglePost = (post) => {
        setOpenPost(openPost === post ? null : post);
    };

    const linkStyle = ({ isActive }) =>
        `flex items-center gap-3 p-2 rounded transition 
     ${isActive ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700"}`;

    const subLinkStyle = ({ isActive }) =>
        `text-sm p-1 rounded transition 
     ${isActive ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700"}`;

    return (
        <div className="z-10 w-64 h-screen">
        <div className="h-screen w-64 bg-gray-900 text-gray-100 p-4 flex flex-col fixed z-0">
            
            <div className="mb-6">
            <h1 className="text-xl font-bold tracking-wide">Painel</h1>
            <p className="text-sm text-gray-300">Gerenciador de promoções</p>
            </div>

            <nav className="flex flex-col gap-2">

                {/* Dashboard */}
                <NavLink to="/" className={linkStyle}>
                    <LayoutDashboard size={20} /> Dashboard
                </NavLink>

                {/* Produtos */}
                <div>
                    <button
                        onClick={() => toggleMenu("produtos")}
                        className="flex justify-between items-center w-full p-2 rounded hover:bg-gray-700 transition"
                    >
                        <div className="flex items-center gap-3">
                            <Package size={20} /> Produtos
                        </div>

                        {openMenu === "produtos" ? (
                            <ChevronDown size={18} />
                        ) : (
                            <ChevronRight size={18} />
                        )}
                    </button>

                    <div
                        className={`ml-6 overflow-hidden transition-all duration-300 ${openMenu === "produtos" ? "max-h-40" : "max-h-0"
                            }`}
                    >
                        <div className="flex flex-col mt-2 gap-2 pl-2">

                            {/* Submenus com NavLink */}
                            <NavLink to="/produtos/cadastrar" className={subLinkStyle}>
                                Cadastrar
                            </NavLink>

                            <NavLink to="/produtos/listar" className={subLinkStyle}>
                                Listar
                            </NavLink>

                        </div>
                    </div>
                </div>

                {/* Postagens */}
                <div>
                    <button
                        onClick={() => togglePost("postagens")}
                        className="flex justify-between items-center w-full p-2 rounded hover:bg-gray-700 transition"
                    >
                        <div className="flex items-center gap-3">
                            <Images size={20} /> Postagens
                        </div>

                        {openPost === "postagens" ? (
                            <ChevronDown size={18} />
                        ) : (
                            <ChevronRight size={18} />
                        )}
                    </button>

                    <div
                        className={`ml-6 overflow-hidden transition-all duration-300 ${openPost === "postagens" ? "max-h-40" : "max-h-0"
                            }`}
                    >
                        <div className="flex flex-col mt-2 gap-2 pl-2">

                            <NavLink to="/postagens/historico" className={subLinkStyle}>
                                Histórico
                            </NavLink>

                            <NavLink to="/postagens/layout" className={subLinkStyle}>
                                Layout
                            </NavLink>

                        </div>
                    </div>
                </div>

            </nav>
            
            <p className="absolute bottom-1 right-3 text-gray-500">v1.0.0</p>
            </div>
        </div>
    );
}
