import { useEffect, useState } from "react";
import { Trash, Edit, Save, X, Send, Clock, ChevronUp, ChevronDown, Search, CheckSquare, Square } from "lucide-react";
import axios from "axios";

const API = "https://promo-scda.onrender.com";

export default function Listar() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [selecionados, setSelecionados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [formEdit, setFormEdit] = useState({
    title: "", store: "", original_url: "", affiliate_url: "",
    price: "", price_original: "", discount_percent: "",
    commission: "", image_url: "", source: "manual", categories: "",
  });

  function showToast(text, type = "ok") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function fetchProdutos() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/produtos`);
      setProdutos(res.data.reverse());
    } finally {
      setLoading(false);
    }
  }

  // Selecionar / desmarcar
  function toggleSelecionado(id) {
    setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  // Selecionar todos / nenhum
  function toggleTodos() {
    if (selecionados.length === produtos.length) {
      setSelecionados([]);
    } else {
      setSelecionados(produtos.map(p => p._id));
    }
  }

  const todosSelecionados = produtos.length > 0 && selecionados.length === produtos.length;
  const algunsSelecionados = selecionados.length > 0 && selecionados.length < produtos.length;

  async function adicionarAFila() {
    if (!selecionados.length) return showToast("Selecione pelo menos 1 produto!", "err");
    try {
      await axios.post(`${API}/api/bot/fila`, { produtos: selecionados });
      showToast(`${selecionados.length} produto(s) adicionado(s) à fila!`);
      setSelecionados([]);
    } catch { showToast("Erro ao adicionar à fila!", "err"); }
  }

  async function enviarSelecionados() {
    if (!selecionados.length) return showToast("Selecione pelo menos 1 produto!", "err");
    try {
      await axios.post(`${API}/api/bot/enviar`, {
        produtos: selecionados,
        chatId: "120363422814810115@g.us"
      });
      showToast(`${selecionados.length} produto(s) enviado(s) para o WhatsApp!`);
      setSelecionados([]);
    } catch { showToast("Erro ao enviar ao WhatsApp!", "err"); }
  }

  async function buscarProduto(e) {
    e.preventDefault();
    if (!busca.trim()) return fetchProdutos();
    try {
      const p = await axios.get(`${API}/api/produtos/${busca}`);
      setProdutos([p.data]);
    } catch {
      const res = await axios.get(`${API}/api/produtos`);
      const filtrados = res.data.filter(p => p.title.toLowerCase().includes(busca.toLowerCase()));
      if (!filtrados.length) showToast("Nenhum produto encontrado", "err");
      setProdutos(filtrados);
    }
  }

  async function deletar(id, e) {
    e.stopPropagation();
    if (!confirm("Excluir este produto?")) return;
    await axios.delete(`${API}/api/produtos/${id}`);
    showToast("Produto excluído!");
    fetchProdutos();
  }

  async function deletarSelecionados() {
    if (!selecionados.length) return showToast("Selecione pelo menos 1 produto!", "err");
    if (!confirm(`Excluir ${selecionados.length} produto(s)?`)) return;
    try {
      await axios.post(`${API}/api/produtos/delete-multiple`, { ids: selecionados });
      showToast(`${selecionados.length} produto(s) excluído(s)!`);
      setSelecionados([]);
      fetchProdutos();
    } catch { showToast("Erro ao excluir!", "err"); }
  }

  function startEdit(p, e) {
    e.stopPropagation();
    setEditando(p._id);
    setFormEdit({
      title: p.title, store: p.store, original_url: p.original_url,
      affiliate_url: p.affiliate_url, price: p.price, commission: p.commission,
      price_original: p.price_original, discount_percent: p.discount_percent,
      image_url: p.image_url, source: p.source, categories: p.categories || "",
    });
  }

  async function salvarEdicao(e) {
    e.stopPropagation();
    await axios.put(`${API}/api/produtos/${editando}`, formEdit);
    setEditando(null);
    showToast("Produto atualizado!");
    fetchProdutos();
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortAsc(a => !a);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
    const sorted = [...produtos].sort((a, b) => {
      const va = (a[field] ?? "").toString().toLowerCase();
      const vb = (b[field] ?? "").toString().toLowerCase();
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    setProdutos(sorted);
  }

  function SortIcon({ field }) {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortAsc ? <ChevronUp className="w-3 h-3 text-orange-400" /> : <ChevronDown className="w-3 h-3 text-orange-400" />;
  }

  useEffect(() => { fetchProdutos(); }, []);

  const toastColors = {
    ok: "bg-green-900 border-green-600 text-green-200",
    err: "bg-red-900 border-red-600 text-red-200",
    info: "bg-blue-900 border-blue-600 text-blue-200",
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white p-6 relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl border text-sm font-medium shadow-2xl transition-all ${toastColors[toast.type]}`}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Produtos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{produtos.length} produto(s) cadastrado(s)</p>
        </div>

        {selecionados.length > 0 && (
          <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-2">
            <span className="text-sm text-orange-400 font-semibold mr-2">{selecionados.length} selecionado(s)</span>
            <button onClick={enviarSelecionados} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
              <Send className="w-3.5 h-3.5" /> Enviar WPP
            </button>
            <button onClick={adicionarAFila} className="flex items-center gap-1.5 bg-[#333] hover:bg-[#444] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
              <Clock className="w-3.5 h-3.5" /> Fila
            </button>
            <button onClick={deletarSelecionados} className="flex items-center gap-1.5 bg-red-700 hover:bg-red-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
              <Trash className="w-3.5 h-3.5" /> Excluir
            </button>
          </div>
        )}
      </div>

      {/* Barra de busca */}
      <form onSubmit={buscarProduto} className="flex gap-2 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none"
          />
        </div>
        <button type="submit" className="bg-orange-500 hover:bg-orange-600 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all">Buscar</button>
        <button type="button" onClick={() => { setBusca(""); fetchProdutos(); }} className="bg-[#1a1a1a] border border-[#333] hover:border-[#555] px-5 py-2.5 rounded-xl text-sm text-gray-400 transition-all">Limpar</button>
      </form>

      {/* Tabela */}
      <div className="rounded-xl overflow-hidden border border-[#222] shadow-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[#161616] text-gray-400 text-xs uppercase tracking-wider">

                {/* Checkbox global */}
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleTodos} className="flex items-center justify-center">
                    {todosSelecionados
                      ? <CheckSquare className="w-4 h-4 text-orange-400" />
                      : algunsSelecionados
                        ? <div className="w-4 h-4 rounded border-2 border-orange-400 bg-orange-400/30" />
                        : <Square className="w-4 h-4 text-gray-600" />
                    }
                  </button>
                </th>

                <th className="px-3 py-3 w-16 text-center">Img</th>

                <th className="px-3 py-3 text-left cursor-pointer hover:text-white" onClick={() => handleSort("title")}>
                  <span className="flex items-center gap-1">Título <SortIcon field="title" /></span>
                </th>

                <th className="px-3 py-3 text-center cursor-pointer hover:text-white" onClick={() => handleSort("store")}>
                  <span className="flex items-center justify-center gap-1">Loja <SortIcon field="store" /></span>
                </th>

                <th className="px-3 py-3 text-center cursor-pointer hover:text-white" onClick={() => handleSort("price")}>
                  <span className="flex items-center justify-center gap-1">Preço <SortIcon field="price" /></span>
                </th>

                <th className="px-3 py-3 text-center cursor-pointer hover:text-white" onClick={() => handleSort("discount_percent")}>
                  <span className="flex items-center justify-center gap-1">Desc. <SortIcon field="discount_percent" /></span>
                </th>

                <th className="px-3 py-3 text-center cursor-pointer hover:text-white" onClick={() => handleSort("categories")}>
                  <span className="flex items-center justify-center gap-1">Categoria <SortIcon field="categories" /></span>
                </th>

                <th className="px-3 py-3 text-center cursor-pointer hover:text-white" onClick={() => handleSort("commission")}>
                  <span className="flex items-center justify-center gap-1">Comissão <SortIcon field="commission" /></span>
                </th>

                <th className="px-3 py-3 text-center cursor-pointer hover:text-white" onClick={() => handleSort("source")}>
                  <span className="flex items-center justify-center gap-1">Origem <SortIcon field="source" /></span>
                </th>

                <th className="px-3 py-3 text-center w-24">Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center text-gray-600">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Carregando produtos...</span>
                    </div>
                  </td>
                </tr>
              ) : produtos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center text-gray-600 text-sm">
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : produtos.map((p, idx) => {
                const sel = selecionados.includes(p._id);
                return (
                  <tr
                    key={p._id}
                    onClick={() => toggleSelecionado(p._id)}
                    className={`border-b border-[#1a1a1a] cursor-pointer transition-colors ${
                      sel ? "bg-orange-500/8 hover:bg-orange-500/12" : idx % 2 === 0 ? "bg-[#141414] hover:bg-[#1c1c1c]" : "bg-[#111] hover:bg-[#1c1c1c]"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => toggleSelecionado(p._id)}
                        className="accent-orange-500 w-4 h-4 cursor-pointer"
                      />
                    </td>

                    {/* Imagem */}
                    <td className="px-3 py-2.5 text-center">
                      <img
                        src={p.image_url}
                        alt=""
                        className="w-12 h-12 object-cover rounded-lg mx-auto bg-[#222]"
                        onError={e => { e.target.style.display = "none"; }}
                      />
                    </td>

                    {/* Título */}
                    <td className="px-3 py-2.5 max-w-xs">
                      {editando === p._id ? (
                        <input
                          className="bg-[#222] border border-[#444] p-1.5 rounded-lg w-full text-xs focus:border-orange-500 focus:outline-none"
                          value={formEdit.title}
                          onChange={e => setFormEdit({ ...formEdit, title: e.target.value })}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-gray-200 text-xs leading-snug line-clamp-2">{p.title}</span>
                      )}
                    </td>

                    {/* Loja */}
                    <td className="px-3 py-2.5 text-center">
                      {editando === p._id ? (
                        <input
                          className="bg-[#222] border border-[#444] p-1.5 rounded-lg w-20 text-xs focus:border-orange-500 focus:outline-none text-center"
                          value={formEdit.store}
                          onChange={e => setFormEdit({ ...formEdit, store: e.target.value })}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-xs px-2 py-1 bg-[#222] rounded-md text-gray-400 capitalize">{p.store || "—"}</span>
                      )}
                    </td>

                    {/* Preço */}
                    <td className="px-3 py-2.5 text-center">
                      {editando === p._id ? (
                        <input
                          type="number"
                          className="bg-[#222] border border-[#444] p-1.5 rounded-lg w-20 text-xs focus:border-orange-500 focus:outline-none text-center"
                          value={formEdit.price}
                          onChange={e => setFormEdit({ ...formEdit, price: e.target.value })}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-green-400 font-semibold text-xs">
                          {p.price ? `R$ ${Number(p.price).toFixed(2)}` : "—"}
                        </span>
                      )}
                    </td>

                    {/* Desconto */}
                    <td className="px-3 py-2.5 text-center">
                      {p.discount_percent ? (
                        <span className="text-xs px-2 py-0.5 bg-red-900/60 text-red-300 rounded-full font-semibold">
                          -{p.discount_percent}%
                        </span>
                      ) : "—"}
                    </td>

                    {/* Categoria */}
                    <td className="px-3 py-2.5 text-center">
                      {editando === p._id ? (
                        <input
                          className="bg-[#222] border border-[#444] p-1.5 rounded-lg w-24 text-xs focus:border-orange-500 focus:outline-none text-center"
                          value={formEdit.categories}
                          onChange={e => setFormEdit({ ...formEdit, categories: e.target.value })}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-xs text-gray-400">{p.categories || "—"}</span>
                      )}
                    </td>

                    {/* Comissão */}
                    <td className="px-3 py-2.5 text-center">
                      {editando === p._id ? (
                        <input
                          className="bg-[#222] border border-[#444] p-1.5 rounded-lg w-20 text-xs focus:border-orange-500 focus:outline-none text-center"
                          value={formEdit.commission}
                          onChange={e => setFormEdit({ ...formEdit, commission: e.target.value })}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-xs text-yellow-400">{p.commission ? `R$ ${p.commission}` : "—"}</span>
                      )}
                    </td>

                    {/* Origem */}
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        p.source === "api" ? "bg-blue-900/60 text-blue-300" :
                        p.source === "manual" ? "bg-purple-900/60 text-purple-300" :
                        "bg-[#222] text-gray-500"
                      }`}>
                        {p.source}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        {editando === p._id ? (
                          <>
                            <button onClick={salvarEdicao} className="p-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/40 transition-colors">
                              <Save className="w-3.5 h-3.5 text-green-400" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); setEditando(null); }} className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 transition-colors">
                              <X className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={e => startEdit(p, e)} className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 transition-colors">
                              <Edit className="w-3.5 h-3.5 text-blue-400" />
                            </button>
                            <button onClick={e => deletar(p._id, e)} className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 transition-colors">
                              <Trash className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rodapé com contagem */}
      {!loading && produtos.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-xs text-gray-600 px-1">
          <span>{produtos.length} produto(s) · {selecionados.length} selecionado(s)</span>
          {selecionados.length > 0 && (
            <button onClick={() => setSelecionados([])} className="text-gray-500 hover:text-gray-300 transition-colors">
              Limpar seleção
            </button>
          )}
        </div>
      )}
    </div>
  );
}
