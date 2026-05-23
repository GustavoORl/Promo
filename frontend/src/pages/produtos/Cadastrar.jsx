import { useState } from "react";
import axios from "axios";

const API = "https://promo-scda.onrender.com";

// ─── Mapeamento dos parâmetros da API Shopee ───────────────────────────────
const LIST_TYPES = [
  { value: 0, label: "Todos os produtos" },
  { value: 1, label: "⚡ Oferta Relâmpago (Flash Sale)" },
  { value: 2, label: "🏷️ Produtos com desconto" },
  { value: 4, label: "🔥 Top vendidos / Tendências" },
];

const SORT_TYPES = [
  { value: 1, label: "✨ Relevância" },
  { value: 2, label: "💸 Maior desconto" },
  { value: 3, label: "🛒 Mais vendidos" },
  { value: 4, label: "💰 Maior comissão" },
  { value: 5, label: "⬇️ Menor preço" },
  { value: 6, label: "⬆️ Maior preço" },
  { value: 7, label: "🆕 Mais recentes" },
];

const PRESETS = [
  {
    label: "Flash Sale",
    icon: "⚡",
    desc: "Ofertas relâmpago ativas agora",
    params: { listType: 1, sortType: 2, isAMSOffer: false },
  },
  {
    label: "Top da Semana",
    icon: "🏆",
    desc: "Mais vendidos com maior comissão",
    params: { listType: 4, sortType: 3, isAMSOffer: false },
  },
  {
    label: "Maior Comissão",
    icon: "💰",
    desc: "Melhores ganhos por produto",
    params: { listType: 0, sortType: 4, isAMSOffer: false },
  },
  {
    label: "Maiores Descontos",
    icon: "🔥",
    desc: "Produtos com maior % de desconto",
    params: { listType: 2, sortType: 2, isAMSOffer: false },
  },
  {
    label: "Patrocinados",
    icon: "📢",
    desc: "Apenas produtos AMS / patrocinados",
    params: { listType: 0, sortType: 1, isAMSOffer: true },
  },
  {
    label: "Mais Recentes",
    icon: "🆕",
    desc: "Lançamentos e novidades",
    params: { listType: 0, sortType: 7, isAMSOffer: false },
  },
];

export default function Cadastrar() {
  const [mode, setMode] = useState("");
  const [apiName, setApiName] = useState("shopee");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  // Parâmetros de importação
  const [keyword, setKeyword] = useState("");
  const [limit, setLimit] = useState(50);
  const [listType, setListType] = useState(0);
  const [sortType, setSortType] = useState(1);
  const [isAMSOffer, setIsAMSOffer] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  // Formulário manual
  const [form, setForm] = useState({
    title: "", store: "", original_url: "", affiliate_url: "",
    price: "", price_original: "", discount_percent: "",
    image_url: "", source: "manual", categories: "",
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function applyPreset(preset, idx) {
    setActivePreset(idx);
    setListType(preset.params.listType);
    setSortType(preset.params.sortType);
    setIsAMSOffer(preset.params.isAMSOffer);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ text: "", type: "" });
    try {
      const data = {
        ...form,
        slug: form.title.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]+/g, ""),
      };
      await axios.post(`${API}/api/produtos/`, data);
      setMsg({ text: "Produto cadastrado com sucesso!", type: "ok" });
      setForm({ title: "", store: "", original_url: "", affiliate_url: "", price: "", price_original: "", discount_percent: "", image_url: "", source: "manual", categories: "" });
    } catch (err) {
      setMsg({ text: "Erro ao cadastrar produto.", type: "err" });
    }
  }

  async function handleImportar() {
    setLoading(true);
    setMsg({ text: "Importando produtos da Shopee...", type: "info" });
    try {
      const endpoint = bulk ? `${API}/api/shopee/import/all` : `${API}/api/shopee/import`;
      const res = await axios.get(endpoint, {
        params: { keyword, limit, listType, sortType, isAMSOffer },
      });
      const d = res.data;
      setMsg({
        text: `✅ Importação concluída! ${d.imported} importados · ${d.skippedDuplicate} duplicados · ${d.skippedBlocked} bloqueados`,
        type: "ok",
      });
    } catch (err) {
      setMsg({ text: "Erro ao importar produtos da Shopee.", type: "err" });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateShopee() {
    setLoading(true);
    setMsg({ text: "Atualizando preços...", type: "info" });
    try {
      const res = await axios.get(`${API}/api/shopee/update`);
      setMsg({ text: `✅ ${res.data.atualizados} produtos atualizados!`, type: "ok" });
    } catch {
      setMsg({ text: "Erro ao atualizar produtos.", type: "err" });
    } finally {
      setLoading(false);
    }
  }

  const msgColors = { ok: "bg-green-900 text-green-300 border-green-700", err: "bg-red-900 text-red-300 border-red-700", info: "bg-blue-900 text-blue-300 border-blue-700" };

  return (
    <div className="min-h-screen bg-[#111] text-white p-8">
      <h1 className="text-3xl font-bold mb-2 text-white">Cadastrar Produtos</h1>
      <p className="text-gray-400 mb-8">Importe via API ou cadastre manualmente</p>

      {msg.text && (
        <div className={`mb-6 p-4 rounded-lg border text-sm font-medium ${msgColors[msg.type]}`}>
          {msg.text}
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-3 mb-8">
        {["api", "manual"].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-6 py-2.5 rounded-lg font-semibold uppercase tracking-wide text-sm transition-all ${
              mode === m ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" : "bg-[#222] text-gray-400 hover:bg-[#2a2a2a]"
            }`}
          >
            {m === "api" ? "🔌 API" : "✏️ Manual"}
          </button>
        ))}
      </div>

      {/* ═══════════════════════ API ═══════════════════════ */}
      {mode === "api" && (
        <div className="space-y-6 max-w-3xl">

          {/* Presets */}
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Importação Rápida</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => applyPreset(p, i)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    activePreset === i
                      ? "border-orange-500 bg-orange-500/10 text-white"
                      : "border-[#333] bg-[#1a1a1a] text-gray-300 hover:border-[#555]"
                  }`}
                >
                  <div className="text-2xl mb-1">{p.icon}</div>
                  <div className="font-semibold text-sm">{p.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Configuração avançada */}
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 space-y-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Configuração Avançada</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Palavra-chave (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: fone, mouse, cozinha..."
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Quantidade</label>
                <input
                  type="number"
                  min={1} max={400}
                  value={limit}
                  onChange={e => setLimit(e.target.value)}
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Tipo de lista</label>
                <select
                  value={listType}
                  onChange={e => { setListType(Number(e.target.value)); setActivePreset(null); }}
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                >
                  {LIST_TYPES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Ordenar por</label>
                <select
                  value={sortType}
                  onChange={e => { setSortType(Number(e.target.value)); setActivePreset(null); }}
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                >
                  {SORT_TYPES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setIsAMSOffer(v => !v)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${isAMSOffer ? "bg-orange-500" : "bg-[#333]"}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isAMSOffer ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm text-gray-300">Apenas patrocinados (AMS)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setBulk(v => !v)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${bulk ? "bg-orange-500" : "bg-[#333]"}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${bulk ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm text-gray-300">Importar múltiplas páginas</span>
                </label>
              </div>
            </div>

            {/* Resumo da config atual */}
            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3 text-xs text-gray-500 font-mono">
              listType={listType} · sortType={sortType} · isAMSOffer={isAMSOffer.toString()} · limit={limit} {keyword && `· keyword="${keyword}"`}
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3">
            <button
              onClick={handleImportar}
              disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all"
            >
              {loading ? "⏳ Importando..." : "⬇️ Importar Shopee"}
            </button>
            <button
              onClick={handleUpdateShopee}
              disabled={loading}
              className="px-6 bg-[#1a1a1a] border border-[#333] hover:border-[#555] disabled:opacity-50 text-gray-300 font-semibold py-3 rounded-xl transition-all"
            >
              🔄 Atualizar preços
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════ MANUAL ═══════════════════════ */}
      {mode === "manual" && (
        <div className="max-w-2xl bg-[#1a1a1a] border border-[#333] rounded-xl p-8">
          <div className="grid grid-cols-2 gap-5">
            {[
              { label: "Título do Produto", name: "title", type: "text", required: true, colSpan: true },
              { label: "Loja", name: "store", type: "select", required: true, options: ["", "mercadolivre", "amazon", "shopee", "magalu", "americanas", "outro"] },
              { label: "URL original", name: "original_url", type: "text", required: true },
              { label: "URL afiliado", name: "affiliate_url", type: "text" },
              { label: "Preço atual", name: "price", type: "number" },
              { label: "Preço original", name: "price_original", type: "number" },
              { label: "% desconto", name: "discount_percent", type: "number" },
              { label: "Imagem (URL)", name: "image_url", type: "text" },
              { label: "Categoria", name: "categories", type: "text" },
            ].map(field => (
              <div key={field.name} className={field.colSpan ? "col-span-2" : ""}>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">{field.label}</label>
                {field.type === "select" ? (
                  <select
                    name={field.name}
                    value={form[field.name]}
                    onChange={handleChange}
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                    required={field.required}
                  >
                    {field.options.map(o => <option key={o} value={o}>{o || "Selecione"}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    name={field.name}
                    value={form[field.name]}
                    onChange={handleChange}
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                    required={field.required}
                  />
                )}
              </div>
            ))}
            <div className="col-span-2">
              <button
                onClick={handleSubmit}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-all"
              >
                Cadastrar Produto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
