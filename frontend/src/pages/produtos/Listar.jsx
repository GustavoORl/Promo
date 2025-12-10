import { useEffect, useState } from "react";
import { Trash, Edit, Save, X } from "lucide-react";
import axios from "axios";

export default function Listar() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);

  const [selecionados, setSelecionados] = useState([]); // ⬅ NOVO

  const [formEdit, setFormEdit] = useState({
    title: "",
    store: "",
    original_url: "",
    affiliate_url: "",
    price: "",
    price_original: "",
    discount_percent: "",
    commission: "",
    image_url: "",
    source: "manual",
    categories: "",
  });

  async function fetchProdutos() {
    const res = await axios.get("https://promo-vtvo.onrender.com/api/produtos");
    setProdutos(res.data);
  }

  // Selecionar / desmarcar produto
  function toggleSelecionado(id) {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function adicionarAFila() {
  if (selecionados.length === 0) {
    alert("Selecione pelo menos 1 produto!");
    return;
  }

  try {
    await axios.post("https://promo-vtvo.onrender.com/api/bot/fila", {
      produtos: selecionados,
    });

    alert("Produtos adicionados à fila!");
    setSelecionados([]);

  } catch (e) {
    console.error(e);
    alert("Erro ao adicionar à fila!");
  }
}

  // ENVIAR MULTIPLOS PRODUTOS
  async function enviarSelecionados() {
    try {
        await axios.post("https://promo-vtvo.onrender.com/api/bot/enviar", {
            produtos: selecionados,
            chatId: "120363422814810115@g.us"
        });
        alert("Produtos enviados para o WhatsApp!");
    } catch (e) {
        console.error(e);
        alert("Erro ao enviar ao WhatsApp");
    }
}


  async function buscarProduto(e) {
    e.preventDefault();
    if (!busca.trim()) return fetchProdutos();

    try {
      let p = await axios.get(`https://promo-vtvo.onrender.com/api/produtos/${busca}`);
      setProdutos([p.data]);
    } catch {
      const res = await axios.get("https://promo-vtvo.onrender.com/api/produtos");
      const filtrados = res.data.filter((prod) =>
        prod.title.toLowerCase().includes(busca.toLowerCase())
      );

      if (filtrados.length === 0) alert("Nenhum produto encontrado");

      setProdutos(filtrados);
    }
  }

  async function deletar(id) {
    if (!confirm("Tem certeza que deseja excluir?")) return;

    await axios.delete(`https://promo-vtvo.onrender.com/api/produtos/${id}`);
    fetchProdutos();
  }

  function startEdit(p) {
    setEditando(p._id);
    setFormEdit({
      title: p.title,
      store: p.store,
      original_url: p.original_url,
      affiliate_url: p.affiliate_url,
      price: p.price,
      commission: p.commission,
      price_original: p.price_original,
      discount_percent: p.discount_percent,
      image_url: p.image_url,
      source: p.source,
      categories: p.categories || "",
    });
  }

  async function salvarEdicao() {
    await axios.put(`https://promo-vtvo.onrender.com/api/produtos/${editando}`, formEdit);
    setEditando(null);
    fetchProdutos();
  }

  function ordenarPorCategoria() {
    const sorted = [...produtos].sort((a, b) => {
      const c1 = (a.categories || "").toLowerCase();
      const c2 = (b.categories || "").toLowerCase();

      if (!c1) return 1;
      if (!c2) return -1;

      return sortAsc ? c1.localeCompare(c2) : c2.localeCompare(c1);
    });

    setProdutos(sorted);
    setSortAsc(!sortAsc);
  }

  useEffect(() => {
    fetchProdutos();
  }, []);

  return (
    <div className="ps-5">
      <h1 className="text-2xl font-bold mb-6">Lista de Produtos</h1>

      {/* BUSCA + BOTÃO ENVIAR SELECIONADOS */}
      <form
        onSubmit={buscarProduto}
        className="p-3 bg-[#242424] flex justify-between items-center rounded-t-lg"
      >
        <div className="flex gap-2 items-center">
          <label htmlFor="buscar" className="text-white">
            Buscar
          </label>

          <input
            className="border border-white rounded-4xl text-white p-1 ps-5 bg-transparent outline-none"
            id="buscar"
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <button className="bg-blue-600 px-4 py-1 rounded text-white">
            OK
          </button>

          <button
            type="button"
            onClick={() => {
              setBusca("");
              fetchProdutos();
            }}
            className="bg-gray-600 px-4 py-1 rounded text-white"
          >
            Limpar
          </button>
        </div>

        <div className="flex gap-3">
        {/*ADICIONAR A FILA */}    
        <button
          type="button"
          onClick={adicionarAFila}
          className="bg-gray-600 px-4 py-1 rounded text-white"
        >
          Adicionar a fila
        </button>

        {/* ENVIAR SELECIONADOS */}
        <button
          type="button"
          onClick={enviarSelecionados}
          className="bg-green-600 px-4 py-1 rounded text-white"
        >
          Enviar Selecionados
        </button>
        </div>
      </form>

      {/* TABELA */}
      <div className="overflow-x-auto shadow-xl rounded-b-lg">
        <table className="min-w-full bg-[#1f1f1f] text-white">
          <thead>
            <tr className="bg-[#2c2c2c] text-center text-sm uppercase">
              <th className="p-4"></th>
              <th className="p-4">Imagem</th>
              <th className="p-4">Título</th>
              <th className="p-4">Loja</th>
              <th className="p-4">Preço</th>
              <th className="p-4 w-36 cursor-pointer" onClick={ordenarPorCategoria}>
               <span className="flex"> categorias{sortAsc ? " ▲" : " ▼"}</span>
              </th>
              <th className="p-4">Comissão</th>
              <th className="p-4">Origem</th>
              <th className="p-4 w-36">Ações</th>
            </tr>
          </thead>

          <tbody className="text-center">
            {produtos.map((p) => (
              <tr
                key={p._id}
                className="border-b border-[#333] hover:bg-[#2a2a2a] transition h-30"
              >
                {/* CHECKBOX */}
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selecionados.includes(p._id)}
                    onChange={() => toggleSelecionado(p._id)}
                  />
                </td>

                <td className="p-3">
                  <img
                    src={p.image_url}
                    alt=""
                    className="w-16 h-16 object-cover rounded"
                  />
                </td>

                {/* TÍTULO */}
                <td className="p-3">
                  {editando === p._id ? (
                    <input
                      className="bg-[#333] p-1 rounded w-full"
                      value={formEdit.title}
                      onChange={(e) =>
                        setFormEdit({ ...formEdit, title: e.target.value })
                      }
                    />
                  ) : (
                    p.title
                  )}
                </td>

                {/* LOJA */}
                <td className="p-3 capitalize">
                  {editando === p._id ? (
                    <input
                      className="bg-[#333] p-1 rounded w-full"
                      value={formEdit.store}
                      onChange={(e) =>
                        setFormEdit({ ...formEdit, store: e.target.value })
                      }
                    />
                  ) : (
                    p.store
                  )}
                </td>

                {/* PREÇO */}
                <td className="p-3">
                  {editando === p._id ? (
                    <input
                      className="bg-[#333] p-1 rounded w-full"
                      value={formEdit.price}
                      onChange={(e) =>
                        setFormEdit({ ...formEdit, price: e.target.value })
                      }
                    />
                  ) : p.price ? (
                    `R$ ${p.price.toFixed(2)}`
                  ) : (
                    "--"
                  )}
                </td>

                {/* CATEGORIAS */}
                <td className="p-3">
                  {editando === p._id ? (
                    <input
                      className="bg-[#333] p-1 rounded w-full"
                      value={formEdit.categories}
                      onChange={(e) =>
                        setFormEdit({ ...formEdit, categories: e.target.value })
                      }
                    />
                  ) : p.categories ? (
                    p.categories
                  ) : (
                    "--"
                  )}
                </td>

                {/*COMISSÃO */}
                <td className="p-3">
                  {editando === p._id ? (
                    <input
                      className="bg-[#333] p-1 rounded w-full"
                      value={formEdit.commission}
                      onChange={(e) =>
                        setFormEdit({ ...formEdit, commission: e.target.value })
                      }
                    />
                  ) : p.commission ? (
                    `R$ ${p.commission}`
                  ) : (
                    "--"
                  )}
                </td>

                <td className="p-3 capitalize">{p.source}</td>

                {/* AÇÕES */}
                <td className="flex gap-3 h-30 justify-center">
                  {editando === p._id ? (
                    <>
                      <button onClick={salvarEdicao}>
                        <Save className="text-green-400" />
                      </button>

                      <button onClick={() => setEditando(null)}>
                        <X className="text-red-400" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(p)}>
                        <Edit className="text-blue-400" />
                      </button>

                      <button onClick={() => deletar(p._id)}>
                        <Trash className="text-red-500" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
