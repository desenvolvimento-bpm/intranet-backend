import React, { useState } from "react";
import axios from "axios";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import "react-datepicker/dist/react-datepicker.css";
import { Box, Button, Input, Flex, Table, Thead, Tbody, Tr, Th, Td } from "@chakra-ui/react";
import { FaSearch, FaFilePdf, FaCalendarAlt, FaBuilding } from "react-icons/fa";

const Relatorio = () => {
    const [dados, setDados] = useState(null);
    const [numeroprojeto, setNumeroProjeto] = useState("");
    const [datainicial, setDataInicial] = useState("");
    const [datafinal, setDataFinal] = useState("");


    const fetchRelatorio = async () => {
        if (!numeroprojeto || !datainicial || !datafinal) {
            alert("Preencha todos os campos antes de pesquisar.");
            return;
        }
        try {
            const response = await axios.get("http://192.168.0.196:5000/api/sg/relatorio-fechamento", {
                params: { numeroprojeto, datainicial, datafinal },
            });
            setDados(response.data);
        } catch (error) {
            console.error("Erro ao buscar relatório:", error);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
    };


    const calcularTotal = (array, key) => {
        return array?.reduce((acc, item) => acc + (parseFloat(item[key]) || 0), 0) || 0;
    };

    const formatQuantity = (value) => {
        if (!value) return "—";
        return Number(value) % 1 === 0 ? Number(value).toString() : Number(value).toFixed(2);
    };


    const formatDate = (isoDate) => {
        if (!isoDate) return "—";
        const date = new Date(isoDate);
        return date.toLocaleDateString("pt-BR", { timeZone: "UTC" }); // 🔹 Converte corretamente
    };



    const adicionarTabela = (titulo, dados, total, colunas, keys, incluirTotalGeral = false, totalGeral = 0) => {
        let tabela = [
            { text: titulo, style: "sectionHeader", margin: [0, 20, 0, 5] },
            {
                table: {
                    headerRows: 1,
                    widths: ["auto", "*", "auto", "auto"],
                    body: [
                        colunas.map((header) => ({
                            text: header,
                            style: "tableHeader", // Mantém o fundo amarelo
                        })),
                        ...(dados || []).map((item) =>
                            keys.map((key) =>
                                key === "dataemissao"
                                    ? formatDate(item?.[key]) // 🔹 Corrige formatação da data
                                    : key === "qt_total"
                                        ? formatQuantity(item?.[key] || 0) // 🔹 Agora a quantidade aparece sem casas decimais extras
                                        : key === "valor_total" || key === "valor_uni"
                                            ? formatCurrency(item?.[key] || 0) // 🔹 Mantém a formatação da moeda
                                            : item?.[key] || "—"
                            )
                        ),
                        [
                            { text: "Total:", colSpan: 3, alignment: "right", bold: true, fillColor: "#FFBF00" },
                            {},
                            {},
                            { text: formatCurrency(total), bold: true, fillColor: "#FFBF00" },
                        ],
                    ],
                },
                layout: "lightHorizontalLines",
            },
        ];

        // 🔹 Se for a tabela de devolução, adiciona "Total Geral:"
        if (incluirTotalGeral) {
            tabela.push({
                table: {
                    widths: ["*", "auto"],
                    body: [
                        [
                            { text: "Total Geral:", alignment: "right", bold: true, fillColor: "#FFBF00" },
                            { text: formatCurrency(totalGeral), bold: true, fillColor: "#FFBF00" },
                        ]
                    ],
                },
                layout: "lightHorizontalLines",
                margin: [0, 5, 0, 5], // Adiciona um espaçamento entre tabelas
            });
        }

        return tabela;
    };


    const exportarPDF = () => {
        if (!dados) {
            console.error("Nenhum dado disponível para gerar o PDF.");
            return;
        }

        const totalExpedicao = calcularTotal(dados?.expedicao, "valor_total");
        const totalDevolucao = calcularTotal(dados?.devolucao, "valor_total");
        const totalGeral = totalExpedicao - totalDevolucao;
        const totalNotasVenda = calcularTotal(dados?.notas, "valor_total");
        const totalNotasRemessa = calcularTotal(dados?.notasRemessa, "valor_total");
        const totalNotasEntrada = calcularTotal(dados?.NotasDevolucaoEntrada, "valor_total");


        const formatDate = (date) => {
            if (!date) return "—";
            return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
        };

        const docDefinition = {
            pageSize: "A4",
            pageMargins: [40, 80, 40, 60],

            defaultStyle: {
                font: "Roboto"
            },

            header: {
                columns: [
                    { image: "bpm_logo", width: 80 },
                    {
                        stack: [
                            { text: "RELATÓRIO DE FECHAMENTO", fontSize: 16, bold: true, alignment: "center" },
                            { text: `Obra: ${dados?.paginaInicial[0]?.descricao_obra || "—"}`, fontSize: 12, alignment: "center", margin: [0, 5] }
                        ],
                    },
                ],
                margin: [40, 20],
            },

            footer: (currentPage, pageCount) => ({
                columns: [
                    {
                        text: "BPM PRÉ-MOLDADOS EIRELI",
                        fontSize: 9,
                        alignment: "center",
                        margin: [0, 5, 0, 0],
                    },
                    {
                        text: "Rod. Luiz Rosso, Km 09, 4ª Linha, Criciúma, SC | Cx. Postal 3552 | CEP 88803-470 | Fone: (48) 3431-8500 | bpm@bpm.com.br | www.bpm.com.br",
                        fontSize: 8,
                        alignment: "center",
                        margin: [0, 0, 0, 10],
                    },
                    {
                        text: `Página ${currentPage} de ${pageCount}`,
                        alignment: "right",
                        fontSize: 9,
                        margin: [0, 10, 40, 0],
                    },
                ],
            }),

            styles: {
                sectionHeader: {
                    fontSize: 14,
                    bold: true,
                    margin: [0, 10, 0, 5],
                },
                tableHeader: {
                    bold: true,
                    fontSize: 11,
                    color: "black",
                    fillColor: "#FFBF00",
                    alignment: "center",
                },
                totalRow: {
                    bold: true,
                    alignment: "right",
                    fillColor: "#FFBF00",
                },
            },
            images: {
                bpm_logo: window.location.origin + "/assets/images/bpm_logo.png",
            },

            content: [
                {
                    columns: [
                        { text: `Pedido: ${numeroprojeto}`, fontSize: 12, bold: true },
                        { text: `Período: ${formatDate(datainicial)} a ${formatDate(datafinal)}`, fontSize: 12, alignment: "right" },
                    ],
                    margin: [0, 10, 0, 10],
                },

                { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }] },

                ...adicionarTabela("RELATÓRIO DE PEÇAS: Expedição", dados?.expedicao, totalExpedicao,
                    ["QTDE", "DESCRIÇÃO", "PREÇO UNIT.", "PREÇO TOTAL"], ["qt_total", "descricao", "valor_uni", "valor_total"]),

                ...adicionarTabela("RELATÓRIO DE PEÇAS: Devolução", dados?.devolucao, totalDevolucao,
                    ["QTDE", "DESCRIÇÃO", "PREÇO UNIT.", "PREÇO TOTAL"], ["qt_total", "descricao_item", "valor_uni", "valor_total"], true, totalGeral),

                ...adicionarTabela("HISTÓRICO DAS NOTAS FISCAIS: Saída (Venda)", dados?.notas, totalNotasVenda,
                    ["DATA", "IDCFOP", "Nº NOTA", "VALOR NOTA FISCAL"], ["dataemissao", "idcfop", "numeronf", "valor_total"]),

                ...adicionarTabela("HISTÓRICO DAS NOTAS FISCAIS: Saída (Remessa)", dados?.notasRemessa, totalNotasRemessa,
                    ["DATA", "IDCFOP", "Nº NOTA", "VALOR NOTA FISCAL"], ["dataemissao", "idcfop", "numeronf", "valor_total"]),

                ...adicionarTabela("HISTÓRICO DAS NOTAS FISCAIS: Entrada (Devolução)", dados?.NotasDevolucaoEntrada, totalNotasEntrada,
                    ["DATA", "IDCFOP", "Nº NOTA", "VALOR NOTA FISCAL"], ["dataemissao", "idcfop", "numero", "valor_total"]),

                { text: "DADOS FINAIS", style: "sectionHeader", margin: [0, 20, 0, 5] },
                {
                    table: {
                        headerRows: 1,
                        widths: ["*", "auto", "auto", "auto", "auto"],
                        body: [
                            [
                                { text: "ITEM", style: "tableHeader" },
                                { text: "CONTRATADO", style: "tableHeader" },
                                { text: "FORNECIDO", style: "tableHeader" },
                                { text: "PAGO", style: "tableHeader" },
                                { text: "SALDO", style: "tableHeader" },
                            ],
                            [
                                "Valor",
                                formatCurrency(dados?.valoraproxcontratado?.[0]?.valor_aprox || 0),
                                formatCurrency(totalGeral),
                                formatCurrency(dados?.valorRecebido?.[0]?.valor_recebido || 0),
                                formatCurrency(totalGeral - (dados?.valorRecebido?.[0]?.valor_recebido || 0)),
                            ],
                        ],
                    },
                    layout: "lightHorizontalLines",
                },
            ],
        };


        pdfMake.createPdf(docDefinition).download(`relatorio_${numeroprojeto}.pdf`);
    };

    return (
        <Box p={5} mt={100} bg="white" borderRadius="lg" boxShadow="lg">
            {/* Filtros em uma única linha */}
            <Flex gap={3} align="center" wrap="wrap">
                {/* Campo Número da Obra */}
                <Box display="flex" alignItems="center" gap={2}>
                    <FaBuilding color="#FFBF00" size={18} />
                    <Input
                        placeholder="Número da Obra"
                        value={numeroprojeto}
                        onChange={(e) => setNumeroProjeto(e.target.value)}
                        width="180px"
                    />
                </Box>

                {/* Campo Data Inicial */}
                <Box display="flex" alignItems="center" gap={2}>
                    <FaCalendarAlt color="#FFBF00" size={18} />
                    <Input
                        type="date"
                        value={datainicial}
                        onChange={(e) => setDataInicial(e.target.value)}
                        width="170px"
                    />
                </Box>

                {/* Campo Data Final */}
                <Box display="flex" alignItems="center" gap={2}>
                    <FaCalendarAlt color="#FFBF00" size={18} />
                    <Input
                        type="date"
                        value={datafinal}
                        onChange={(e) => setDataFinal(e.target.value)}
                        width="170px"
                    />
                </Box>

                {/* Botão de Pesquisa */}
                <Button leftIcon={<FaSearch />} colorScheme="yellow" bg="#FFBF00" onClick={fetchRelatorio}>
                    Pesquisar
                </Button>
            </Flex>

            {/* Exibir tabela inicial se houver dados */}
            {dados?.paginaInicial?.length > 0 && (
                <Box mt={5}>
                    <Table variant="simple">
                        <Thead>
                            <Tr>
                                <Th>Nome da Obra</Th>
                                <Th>ID Obra</Th>
                                <Th>Razão Social do Cliente</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            <Tr>
                                <Td>{dados.paginaInicial[0].descricao_obra}</Td>
                                <Td>{dados.paginaInicial[0].idprojeto}</Td>
                                <Td>{dados.paginaInicial[0].razao}</Td>
                            </Tr>
                        </Tbody>
                    </Table>
                </Box>
            )}
            {dados && (
                <Box mt={5} textAlign="right">
                    <Button leftIcon={<FaFilePdf />} colorScheme="red" onClick={exportarPDF}>
                        Exportar PDF
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default Relatorio;


