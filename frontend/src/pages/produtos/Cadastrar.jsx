import { useState } from "react";
import axios from "axios";

export default function Cadastrar() {
  const [form, setForm] = useState({
    title: "",
    store: "",
    original_url: "",
    affiliate_url: "",
    price: "",
    price_original: "",
    discount_percent: "",
    image_url: "",
    source: "manual",
    categories: "",
  });

  const [mode, setMode] = useState(""); // "manual" | "api"
  const [apiName, setApiName] = useState(""); // shopee, awin...
  const [msg, setMsg] = useState("");
  const [keyword, setKeyword] = useState("");
  const [limit, setLimit] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    try {
      await axios.post("https://promo-vtvo.onrender.com/api/produtos", form);
      setMsg("Produto cadastrado com sucesso!");

      setForm({
        title: "",
        store: "",
        original_url: "",
        affiliate_url: "",
        price: "",
        price_original: "",
        discount_percent: "",
        image_url: "",
        source: "manual",
        categories: "",
      });
    } catch (err) {
      console.log(err);
      setMsg("Erro ao cadastrar produto.");
    }
  }

  async function handleImportarShopee() {
    setMsg("Importando produtos da Shopee...");

    try {
      const res = await axios.get(`https://promo-vtvo.onrender.com/api/shopee/import?keyword=${keyword}&limit=${limit}`);
      setMsg(`Importação concluída! ${res.data.imported} produtos importados. ${res.data.skippedBlocked} produtos bloqueados(roupas). ${res.data.skippedDuplicate} items bloqueados(duplicados)`);
    } catch (err) {
      console.log(err);
      setMsg("Erro ao importar produtos da Shopee.");
    }
  }

  async function handleUpdateShopee() {
    setMsg("Atualizando produtos da Shopee...");

    try {
      const res = await axios.get("https://promo-vtvo.onrender.com/api/shopee/update");
      setMsg(`Atualização concluída! ${res.data.atualizados} produtos atualizados.`);
    } catch (err) {
      console.log(err);
      setMsg("Erro ao atualizar produtos da Shopee.");
    }
  }

  return (
    <div className="p-10 text-white">
      <h1 className="text-3xl text-black font-bold mb-6">Cadastrar Produtos</h1>

      {msg && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded">{msg}</div>
      )}

      {/* Botões principais */}
      <div className="flex gap-5 mb-10">
        <button
          className={`px-5 py-2 rounded ${mode === "api" ? "bg-blue-600" : "bg-gray-600"}`}
          onClick={() => setMode("api")}
        >
          API
        </button>

        <button
          className={`px-5 py-2 rounded ${mode === "manual" ? "bg-blue-600" : "bg-gray-600"}`}
          onClick={() => setMode("manual")}
        >
          MANUAL
        </button>
      </div>

      {/* ----------------------------- API MODE ----------------------------- */}
      {mode === "api" && (
        <div className="bg-[#242424] p-10 rounded-lg w-[80vw]">
          <h2 className="text-xl font-bold mb-4">Importação via API</h2>

          {/* Escolher API */}
          <label className="font-semibold">Escolher API</label>
          <select
            className="border p-2 rounded w-full text-white mb-5"
            value={apiName}
            onChange={(e) => setApiName(e.target.value)}
          >
            <option className="text-black" value="">Selecione</option>
            <option className="text-black" value="shopee">Shopee</option>
            <option className="text-black" value="awin">Awin</option>
          </select>

          <input
            type="text"
            placeholder="Pesquisar por palavra-chave (ex: mouse, fone...)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="border p-2 rounded text-white w-full mb-5"
          />

          <input
            type="number"
            placeholder="Quantidade de itens buscados"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="border p-2 rounded text-white w-full"
          />

          {/* Botões específicos por API */}
          {apiName === "shopee" && (
            <div className="flex gap-4 mt-5">
              <button
                onClick={handleImportarShopee}
                className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
              >
                Importar Shopee
              </button>

              <button
                onClick={handleUpdateShopee}
                className="bg-yellow-600 px-4 py-2 rounded hover:bg-yellow-700"
              >
                Atualizar Shopee
              </button>
            </div>
          )}

          {apiName === "awin" && (
            <p className="mt-4 text-sm opacity-70">
              Ação da AWIN será adicionada aqui quando integrarmos a API.
            </p>
          )}
        </div>
      )}

      {/* --------------------------- MANUAL MODE --------------------------- */}
      {mode === "manual" && (
        <div className="flex justify-center items-center">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-2 gap-6 max-w-3xl bg-[#242424] p-20"
          >
            {/* Título */}
            <div className="flex flex-col">
              <label className="font-semibold">Título do Produto</label>
              <input
                type="text"
                name="title"
                className="border p-2 rounded text-white"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>

            {/* Loja */}
            <div className="flex flex-col">
              <label className="font-semibold">Loja</label>
              <select
                name="store"
                className="border p-2 rounded text-white"
                value={form.store}
                onChange={handleChange}
                required
              >
                <option className="text-black" value="">Selecione</option>
                <option className="text-black" value="mercadolivre">Mercado Livre</option>
                <option className="text-black" value="amazon">Amazon</option>
                <option className="text-black" value="shopee">Shopee</option>
                <option className="text-black" value="magalu">Magazine Luiza</option>
                <option className="text-black" value="americanas">Americanas</option>
                <option className="text-black" value="outro">Outro</option>
              </select>
            </div>

            {/* URL normal */}
            <div className="flex flex-col">
              <label className="font-semibold">URL original</label>
              <input
                type="text"
                name="original_url"
                className="border p-2 rounded text-white"
                value={form.original_url}
                onChange={handleChange}
                required
              />
            </div>

            {/* URL afiliado */}
            <div className="flex flex-col">
              <label className="font-semibold">URL afiliado</label>
              <input
                type="text"
                name="affiliate_url"
                className="border p-2 rounded text-white"
                value={form.affiliate_url}
                onChange={handleChange}
              />
            </div>

            {/* Preços */}
            <div className="flex flex-col">
              <label className="font-semibold">Preço atual</label>
              <input
                type="number"
                name="price"
                className="border p-2 rounded text-white"
                value={form.price}
                onChange={handleChange}
              />
            </div>

            <div className="flex flex-col">
              <label className="font-semibold">Preço original</label>
              <input
                type="number"
                name="price_original"
                className="border p-2 rounded text-white"
                value={form.price_original}
                onChange={handleChange}
              />
            </div>

            <div className="flex flex-col">
              <label className="font-semibold">% de desconto</label>
              <input
                type="number"
                name="discount_percent"
                className="border p-2 rounded text-white"
                value={form.discount_percent}
                onChange={handleChange}
              />
            </div>

            {/* Imagem */}
            <div className="flex flex-col">
              <label className="font-semibold">Imagem (URL)</label>
              <input
                type="text"
                name="image_url"
                className="border p-2 rounded text-white"
                value={form.image_url}
                onChange={handleChange}
              />
            </div>

            {/* Origem */}
            <div className="flex flex-col">
              <label className="font-semibold">Origem</label>
              <select
                name="source"
                className="border p-2 rounded text-white"
                value={form.source}
                onChange={handleChange}
                required
              >
                <option className="text-black" value="manual">Manual</option>
                <option className="text-black" value="scraping">Scraping</option>
                <option className="text-black" value="api">API</option>
              </select>
            </div>

            {/* Categorias */}
            <div className="flex flex-col">
              <label className="font-semibold">Categoria</label>
              <input
                type="text"
                name="categories"
                className="border p-2 rounded text-white"
                value={form.categories}
                onChange={handleChange}
              />
            </div>

            {/* Botão */}
            <div className="col-span-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
              >
                Cadastrar Produto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
