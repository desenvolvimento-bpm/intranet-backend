const express = require('express');
const Joi = require("joi");
const axios = require('axios');
const { pgPool, getMssqlConnection, mssql } = require('../database/db_sg.js'); // Correção aqui

const router = express();

// Esquema de validação usando Joi
const querySchema = Joi.object({
    ano: Joi.number().integer().min(2000).max(new Date().getFullYear()).optional(),
    mes: Joi.number().integer().min(1).max(12).optional(),
    numeroprojeto: Joi.string().optional(),
    datainicial: Joi.string().optional(),
    datafinal: Joi.string().optional()

});

router.get('/custo-fixo', async (req, res) => {
    try {
        const { error, value } = querySchema.validate(req.query);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { ano, mes } = value;
        if (!ano || !mes) {
            return res.status(400).json({ error: 'Ano e mês são obrigatórios' });
        }
        const query = `
              SELECT 
                  ROW_NUMBER() OVER() as id_unico,
                  nfs.numeroprojeto,
                  i.referencia, 
                  i.descricao, 
                  gp.descricao as grupo, 
                  nfsi.qt, 
                  nfsi.valor, 
                  nfsi.valor_total, 
                  nfs.idtransacao, 
                  nfst.descricao as transacao, 
                  nfsi.geraestoque, 
                  nfs.numeronf, 
                  cfop.idcfop,
                  cfop.descricao as cfop, 
                  cdp.descricao as condicao_pag, 
                  nfs.dataemissao, 
                  nfs.datasaida 
              FROM 
                  item i 
              JOIN 
                  nfs_item nfsi ON i.iditem = nfsi.iditem 
              JOIN 
                  nfs ON nfsi.idnfs = nfs.idnfs
              JOIN 
                  grupo gp ON i.idgrupo = gp.idgrupo 
              JOIN 
                  nfs_transacao nfst ON nfs.idtransacao = nfst.idtransacao 
              JOIN 
                  cfop ON nfs.idcfop = cfop.idcfop 
              JOIN 
                  condicaopagto cdp ON nfs.idcondicao = cdp.idcondicao
              WHERE 
                  EXTRACT(YEAR FROM nfs.dataemissao) = $1
                  AND EXTRACT(MONTH FROM nfs.dataemissao) = $2
              AND gp.idgrupo IN ('143', '161', '162', '163', '164', '165', '166', '167')
              AND nfs.status in ('2');
          `;

        const result = await pgPool.query(query, [ano, mes]);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar custo-fixo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// End-point: Buscar nota fiscal entrada
router.get('/nf-entrada', async (req, res) => {
    try {
        const { error, value } = querySchema.validate(req.query);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { ano, mes } = value;
        if (!ano || !mes) {
            return res.status(400).json({ error: 'Ano e mês são obrigatórios' });
        }
        const query = `
              SELECT 
	ROW_NUMBER() OVER() as id_unico,
	nfe.numeroprojeto,
    i.referencia, 
    i.descricao, 
    gp.idgrupo,
    gp.descricao as grupo, 
    nfei.qt, 
    nfei.valor, 
    nfei.valortotal, 
    nfe.idtransacao, 
    nfet.descricao as transacao, 
    nfei.geraestoque, 
    nfe.numero, 
    cfop.idcfop,
    cfop.descricao as cfop, 
    cdp.descricao as condicao_pag, 
    nfe.dataemissao, 
    nfe.dataentrada 
FROM 
    item i 
JOIN 
    nfe_item nfei ON i.iditem = nfei.iditem 
JOIN 
    nfe ON nfei.idnfe = nfe.idnfe
JOIN 
    grupo gp ON i.idgrupo = gp.idgrupo 
JOIN 
    nfe_transacao nfet ON nfe.idtransacao = nfet.idtransacao 
JOIN 
    cfop ON nfe.idcfop = cfop.idcfop 
JOIN 
    condicaopagto cdp ON nfe.idcondicao = cdp.idcondicao
WHERE 
    EXTRACT(YEAR FROM nfe.dataemissao) = $1
    AND EXTRACT(MONTH FROM nfe.dataemissao) = $2
AND gp.idgrupo IN ('143', '161', '162', '163', '164', '165', '166', '167')
and nfe.status in ('2')
          `;
        const result = await pgPool.query(query, [ano, mes]);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar nf entrada:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

router.get("/cargas-expedidas", async (req, res) => {
    try {
        const { ano, mes } = req.query;

        if (!ano || !mes) {
            return res.status(400).json({ error: "Ano e mês são obrigatórios" });
        }

        const dataInicial = `01/${mes.padStart(2, "0")}/${ano}`;
        const lastDay = new Date(ano, mes, 0).getDate();
        const dataFinal = `${lastDay}/${mes.padStart(2, "0")}/${ano}`;

        const url = `http://179.124.195.91:1890/ADM_BPM/api/bi/cargasexpedidas`;
        const params = { dataInicial, dataFinal };

        const response = await axios.get(url, { params });

        // Processar os dados para gerar IDs únicos
        const processedData = response.data.flatMap((row) =>
            row.pecas.map((peca) => ({
                id_unico: `${row.codProgCargas}-${peca.CodigoControle}`, // IDs únicos
                Data: row.Data,
                codProgCargas: row.codProgCargas,
                siglaObra: row.siglaObra,
                nomeObra: row.nomeObra,
                nomePeca: peca.NomePeca,
                CodigoControle: peca.CodigoControle,
                Peso: peca.Peso,
            }))
        );

        res.json(processedData); // Retorna os dados processados
    } catch (error) {
        console.error("Erro ao buscar cargas expedidas:", error.message);
        res.status(500).json({ error: "Erro ao buscar cargas expedidas" });
    }
});
// Rota: API Projetadas
router.get("/projetadas", async (req, res) => {
    try {
        const { ano, mes, sigla } = req.query;

        if (!ano || !mes || !sigla) {
            return res.status(400).json({ error: 'Parâmetros ano, mes e sigla são obrigatórios' });
        }
        const dataInicial = `01/${String(mes).padStart(2, "0")}/${ano}`;
        const lastDay = new Date(ano, mes, 0).getDate();
        const dataFinal = `${lastDay}/${String(mes).padStart(2, "0")}/${ano}`;

        const response = await axios.get("http://179.124.195.91:1890/ADM_BPM/api/bi/pecasProjetadas", {
            params: { dataInicial, dataFinal, sigla },
        });

        res.json(response.data);
    } catch (err) {
        console.error("Erro ao buscar dados projetados:", err.message);
        res.status(500).json({ error: "Erro ao buscar dados projetados" });
    }
});


router.get("/movtoestoque", async (req, res) => {
    try {
        // Validação dos parâmetros reutilizando o schema existente
        const { error, value } = querySchema.validate(req.query);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { ano, mes } = value;

        // Query de consulta
        const query = `
        SELECT
          ROW_NUMBER() OVER() AS id_unico,
          filial.nome AS empresa,
          mov.data,
          item.referencia1 AS projeto,
          item.referencia2 AS codigo,
          item.referencia3 AS rotulo,
          mov.entradasaida,
          mov.quantidade,
          mov.origem,
          mov.motivo,
          item.embalagem_comprimento AS volume
        FROM movtoestoque mov
        JOIN item ON item.iditem = mov.iditem
        JOIN filial ON filial.idfilial = mov.idfilial
        WHERE item.idgrupo IN (161, 162, 163, 164, 165, 166, 167)
          AND mov.origem NOT IN (1, 5)
          AND mov.motivo <> ''
          AND mov.motivo <> 'Apontamento SG'
          AND EXTRACT(YEAR FROM mov.data) = $1
          AND EXTRACT(MONTH FROM mov.data) = $2
        ORDER BY mov.data;
      `;

        // Conectar ao PostgreSQL e executar a consulta
        const result = await pgPool.query(query, [ano, mes]);

        res.json(result.rows); // Retorna os dados como JSON
    } catch (error) {
        console.error("Erro ao buscar dados de movimentação de estoque:", error.message);
        res.status(500).json({ error: "Erro ao buscar dados de movimentação de estoque" });
    }
});

router.get("/requisicoes", async (req, res) => {
    try {
        // Validação dos parâmetros reutilizando o schema existente
        const { error, value } = querySchema.validate(req.query);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { ano, mes } = value;

        // Query para buscar dados de requisições
        const query = `
        SELECT 
          ROW_NUMBER() OVER() AS id_unico,
          requisicao_item.idrequisicao,
          requisicao_item.idfilial,
          requisicao_baixa.data,
          item.referencia,
          item.descricao,
          requisicao_baixa_item.quantidade_usada,
          requisicao_baixa_item.valor_customedio,
          requisicao_baixa.idcontacontabil,
          projeto.numero AS numero_projeto,
          projeto.descricao AS nome_projeto,
          grupo.idgrupo,
          grupo.descricao AS desc_grupo,
          un.sigla AS unidade
        FROM requisicao_item
        INNER JOIN requisicao_baixa_item 
          ON requisicao_baixa_item.idrequisicao = requisicao_item.idrequisicao
          AND requisicao_baixa_item.idrequisicaobaixaitem = requisicao_item.sequencial
        INNER JOIN requisicao_baixa 
          ON requisicao_baixa.idrequisicaobaixa = requisicao_baixa_item.idrequisicaobaixa
        INNER JOIN item 
          ON item.iditem = requisicao_baixa_item.iditem
        INNER JOIN unidade un 
          ON un.idunidade = item.idunidadebasica
        INNER JOIN grupo 
          ON grupo.idgrupo = item.idgrupo
        INNER JOIN projeto 
          ON projeto.idprojeto = requisicao_item.idprojeto
        WHERE 
          EXTRACT(MONTH FROM requisicao_baixa.data) = $1 
          AND EXTRACT(YEAR FROM requisicao_baixa.data) = $2
        ORDER BY 
          requisicao_baixa_item.idfilial, 
          requisicao_baixa.data, 
          requisicao_baixa_item.idrequisicaobaixa;
      `;

        // Executar a consulta no banco PostgreSQL
        const result = await pgPool.query(query, [mes, ano]);

        res.json(result.rows); // Retornar os resultados como JSON
    } catch (error) {
        console.error("Erro ao buscar dados de requisições:", error.message);
        res.status(500).json({ error: "Erro ao buscar dados de requisições" });
    }
});

router.get("/notas", async (req, res) => {
    try {
        // Validação dos parâmetros reutilizando o schema existente
        const { error, value } = querySchema.validate(req.query);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { ano, mes } = value;

        // Query para buscar dados de notas
        const query = `
        SELECT 
          ROW_NUMBER() OVER() AS id_unico,
          nfe.idfilial, 
          nfe.idnfe, 
          nfe.numero, 
          nfe.dataemissao, 
          nfe.dataentrada, 
          projeto.numero AS numero_projeto, 
          projeto.descricao AS nome_projeto, 
          cliforemp.fantasia, 
          nfe.idserie, 
          doc_lancto_contabil.idcontadebitar, 
          pld.descricao AS conta_debito, 
          pld.classificacao AS class_debito, 
          doc_lancto_contabil.valor 
        FROM 
          doc_lancto_contabil
        INNER JOIN 
          nfe ON nfe.idnfe = doc_lancto_contabil.iddoc AND nfe.idfilial = doc_lancto_contabil.idfilial
        INNER JOIN 
          projeto ON projeto.idprojeto = nfe.idprojeto
        INNER JOIN 
          cliforemp ON nfe.idcliforemp = cliforemp.idcliforemp
        LEFT OUTER JOIN 
          planodeconta pld ON pld.idconta = doc_lancto_contabil.idcontadebitar
        WHERE 
          doc_lancto_contabil.origem_contabil = 2 
          AND doc_lancto_contabil.idcontadebitar > 0 
          AND EXTRACT(YEAR FROM nfe.dataentrada) = $1
          AND EXTRACT(MONTH FROM nfe.dataentrada) = $2
          AND nfe.idtransacao IN (5,10,11,33,37,38,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,65,68,72,85,86,87,91,97,99,101);
      `;

        // Executar a consulta no banco PostgreSQL
        const result = await pgPool.query(query, [ano, mes]);

        res.json(result.rows); // Retorna os resultados como JSON
    } catch (error) {
        console.error("Erro ao buscar dados de notas:", error.message);
        res.status(500).json({ error: "Erro ao buscar dados de notas" });
    }
});

router.get('/producao-sg', async (req, res) => {
    try {
        const { ano, mes } = req.query;

        if (!ano || !mes) {
            return res.status(400).json({ error: 'Ano e mês são obrigatórios' });
        }

        const query = `
            SELECT 
                ROW_NUMBER() OVER() AS id_unico,
                gr.descricao AS linha,
                pe.codigo,
                pr.rotulo,
                pr.data,
                pr.idobra,
                orca.nomeobra,
                tr.descricao AS descricao_traco,
                SUM(pr.qtde * pr.volume) AS volume_produzido,
                SUM(pr.qtde * (pr.base * pr.compr)) AS area_produzida,
                SUM(pr.qtde * pr.compr) AS comprimento_produzido,
                SUM(pr.qtde) AS qtde_produzida,
                (
                    SELECT COALESCE(SUM(BI.PESO * PA.QTDE * PA.COMPR), 0)
                    FROM SGBPM_PRODUTOORDEMACO AS PA
                    INNER JOIN SGBPM_BITOLAS AS BI ON BI.CODIGO = PA.CODIGO
                    WHERE ACO ILIKE 'CA%' AND PA.IDPRODUTOORDEM = PR.IDPRODUTOORDEM
                ) / pr.volume AS taxa_ca,
                (
                    SELECT COALESCE(SUM(BI.PESO * PA.QTDE * PA.COMPR), 0)
                    FROM SGBPM_PRODUTOORDEMACO AS PA
                    INNER JOIN SGBPM_BITOLAS AS BI ON BI.CODIGO = PA.CODIGO
                    WHERE ACO ILIKE 'CP%' AND PA.IDPRODUTOORDEM = PR.IDPRODUTOORDEM
                ) / pr.volume AS taxa_cp
            FROM sgbpm_produtoordem pr
            LEFT JOIN sgbpm_traco tr ON tr.idtraco = pr.idtraco
            JOIN sgbpm_produtoestoque pe ON pe.idproduto = pr.idproduto
            JOIN sgbpm_grupoorcamentos gr ON gr.idgrupo = pe.idgrupo
            JOIN sgbpm_obras ob ON ob.idobra = pr.idobra
            JOIN sgbpm_orcamentos orca ON orca.idorcamento = ob.idorcamento AND orca.revisao = ob.revisao
            WHERE pr.status = 'Produzido'
            AND EXTRACT(YEAR FROM pr.data) = $1
            AND EXTRACT(MONTH FROM pr.data) = $2
            AND pr.volume > 0
            GROUP BY pr.idprodutoordem, pe.codigo, pr.rotulo, pr.data, gr.descricao, pr.idobra, orca.nomeobra, tr.descricao;
        `;

        const result = await pgPool.query(query, [ano, mes]);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar dados de Produção (SG):', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});


router.get('/expedicao-sg', async (req, res) => {
    try {
        const { ano, mes } = req.query;

        if (!ano || !mes) {
            return res.status(400).json({ error: 'Ano e mês são obrigatórios' });
        }

        const query = `
            SELECT 
                ROW_NUMBER() OVER() AS id_unico,
                gr.descricao AS linha,
                pe.codigo,
                po.rotulo,
                po.idobra,
                orca.nomeobra,
                me.data,
                tr.descricao AS descricao_traco,
                SUM(me.qtde * po.volume) AS volume_expedido,
                SUM(me.qtde * (po.base * po.compr)) AS area_expedida,
                SUM(me.qtde * po.compr) AS comprimento_expedido,
                SUM(me.qtde) AS qtde_expedida,
                (
                    SELECT COALESCE(SUM(BI.PESO * PA.QTDE * PA.COMPR), 0)
                    FROM SGBPM_PRODUTOObraACO AS PA
                    INNER JOIN SGBPM_BITOLAS AS BI ON BI.CODIGO = PA.CODIGO
                    WHERE ACO ILIKE 'CA%' AND PA.IDPRODUTOobra = Po.IDPRODUTOobra
                ) / po.volume AS taxa_ca,
                (
                    SELECT COALESCE(SUM(BI.PESO * PA.QTDE * PA.COMPR), 0)
                    FROM SGBPM_PRODUTOObraACO AS PA
                    INNER JOIN SGBPM_BITOLAS AS BI ON BI.CODIGO = PA.CODIGO
                    WHERE ACO ILIKE 'CP%' AND PA.IDPRODUTOobra = Po.IDPRODUTOobra
                ) / po.volume AS taxa_cp
            FROM sgbpm_movestoque me
            JOIN sgbpm_produtoobra po ON po.idprodutoobra = me.idprodutoobra
            LEFT JOIN sgbpm_traco tr ON tr.idtraco = po.idtraco
            JOIN sgbpm_produtoestoque pe ON pe.idproduto = po.idproduto
            JOIN sgbpm_grupoorcamentos gr ON gr.idgrupo = pe.idgrupo
            JOIN sgbpm_obras ob ON ob.idobra = po.idobra
            JOIN sgbpm_orcamentos orca ON orca.idorcamento = ob.idorcamento AND orca.revisao = ob.revisao
            WHERE po.volume > 0
            AND po.expedido > 0
            AND me.status = 'Expedido'
            AND me.idtipo = 7
            AND EXTRACT(YEAR FROM me.data) = $1
            AND EXTRACT(MONTH FROM me.data) = $2
            GROUP BY me.data, po.idprodutoobra, pe.codigo, po.rotulo, gr.descricao, po.idobra, orca.nomeobra, tr.descricao;
        `;

        const result = await pgPool.query(query, [ano, mes]);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar dados de Expedição (SG):', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Proxy para API Projetadas
router.get('/producaoPlannix', async (req, res) => {
    try {
        const { ano, mes } = req.query;

        if (!ano || !mes) {
            return res.status(400).json({ error: 'Parâmetros ano, mes são obrigatórios' });
        }

        const dataInicial = `01/${mes.padStart(2, '0')}/${ano}`;
        const lastDay = new Date(ano, mes, 0).getDate();
        const dataFinal = `${lastDay}/${mes.padStart(2, '0')}/${ano}`;

        const response = await axios.get('http://179.124.195.91:1890/ADM_BPM/api/bi/producaosemconsumo', {
            params: {
                dataInicial,
                dataFinal,
            },
        });

        res.json(response.data);
    } catch (error) {
        console.error('Erro ao buscar dados projetados:', error);
        res.status(500).json({ error: 'Erro ao buscar dados projetados' });
    }
});

router.get('/montagemPlannix', async (req, res) => {
    try {
        const { ano, mes, sigla } = req.query;

        if (!ano || !mes || !sigla) {
            return res.status(400).json({ error: 'Parâmetros ano, mes e sigla são obrigatórios' });
        }

        const dataInicial = `01/${mes.padStart(2, '0')}/${ano}`;
        const lastDay = new Date(ano, mes, 0).getDate();
        const dataFinal = `${lastDay}/${mes.padStart(2, '0')}/${ano}`;

        const response = await axios.get('http://179.124.195.91:1890/ADM_BPM/api/bi/pecasMontadas', {
            params: {
                dataInicial,
                dataFinal,
                sigla,
            },
        });

        res.json(response.data);
    } catch (error) {
        console.error('Erro ao buscar dados projetados:', error);
        res.status(500).json({ error: 'Erro ao buscar dados projetados' });
    }
});

router.get('/rh-dados', async (req, res) => {
    const { ano, mes } = req.query;

    // Validação dos parâmetros
    if (!ano || !mes) {
        //console.error('[API RH Dados] Ano e mês são obrigatórios.');
        return res.status(400).json({ error: 'Ano e mês são obrigatórios.' });
    }

    try {
        const mssqlPool = await getMssqlConnection();
        //console.log('[API RH Dados] Conexão MSSQL estabelecida.');

        // **Consulta 1: Obter `codcal`**
        const codcalQuery = `
        SELECT codcal 
        FROM r044cal WITH(NOLOCK) 
        WHERE numemp = 1 
          AND MONTH(PERREF) = @mes 
          AND YEAR(PERREF) = @ano 
          AND tipcal = 11;
      `;
        const codcalResult = await mssqlPool.request()
            .input('mes', mssql.Int, mes) // Passa o mês como parâmetro
            .input('ano', mssql.Int, ano) // Passa o ano como parâmetro
            .query(codcalQuery);

        if (!codcalResult.recordset.length) {
            //console.warn('[API RH Dados] Mês ainda não fechou a folha de pagamento.');
            return res.status(404).json({ error: 'Mês ainda não fechou a folha de pagamento.' });
        }

        const codcal = codcalResult.recordset[0].codcal;
        //console.log(`[API RH Dados] codcal obtido: ${codcal}`);

        const mainQuery = `
      SELECT 
        ROW_NUMBER() OVER(ORDER BY fun.numloc) AS id_unico,
        SUM(valeve) AS cred,
        fun.numloc,
        r016hie.codloc,
        r016orn.nomloc,
        (
          SELECT SUM(prvmes) 
          FROM r146prv 
          JOIN r034fun 
            ON r146prv.numcad = r034fun.numcad 
           AND r146prv.numemp = r034fun.numemp
          WHERE r146prv.numemp = 1 
            AND r146prv.tipprv = 1 
            AND r034fun.numloc = fun.numloc 
            AND MONTH(mesano) = @mes 
            AND YEAR(mesano) = @ano
        ) AS ferias,
        (
          SELECT SUM(prvmes) 
          FROM r146prv 
          JOIN r034fun 
            ON r146prv.numcad = r034fun.numcad 
           AND r146prv.numemp = r034fun.numemp
          WHERE r146prv.numemp = 1 
            AND r146prv.tipprv = 2 
            AND r034fun.numloc = fun.numloc 
            AND MONTH(mesano) = @mes 
            AND YEAR(mesano) = @ano
        ) AS decimo
      FROM r046ver 
      JOIN r034fun AS fun 
        ON r046ver.numcad = fun.numcad 
       AND r046ver.numemp = fun.numemp 
       AND fun.tipcol = 1
      JOIN r008evc 
        ON r008evc.codeve = r046ver.codeve 
       AND r008evc.codtab = r046ver.tabeve
      JOIN r016orn 
        ON r016orn.numloc = fun.numloc
      JOIN r016hie 
        ON r016hie.numloc = fun.numloc
      WHERE r046ver.numemp = 1 
        AND r008evc.tipeve IN (1, 2, 4, 5)
        AND codcal = @codcal
      GROUP BY 
        fun.numloc,
        r016hie.codloc,
        r016orn.nomloc
      ORDER BY 
        fun.numloc;
    `;

        const mainResult = await mssqlPool.request()
            .input('mes', mssql.Int, mes)
            .input('ano', mssql.Int, ano)
            .input('codcal', mssql.Int, codcal)
            .query(mainQuery);

        res.json(mainResult.recordset);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});


router.get('/relatorio-fechamento', async (req, res) => {
    try {
        const { error, value } = querySchema.validate(req.query);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { numeroprojeto, datainicial, datafinal } = value;

        console.log("🔍 Parâmetros recebidos:", { numeroprojeto, datainicial, datafinal });

        const sqlExpedicao = `SELECT 
    pro.idprojeto,
    pro.descricao,
    nfs.numeroprojeto,
    i.referencia1, 
    i.referencia2,
    i.referencia3, 
    MAX(i.descricao) AS descricao, 
    gp.descricao AS grupo, 
    COALESCE(SUM(nfsi.qt), 0) AS qt_total, 
    COALESCE(SUM(nfsi.valor_total) / NULLIF(SUM(nfsi.qt), 0), 0) AS valor_uni, 
    COALESCE(SUM(nfsi.valor_total), 0) AS valor_total
FROM item i 
JOIN nfs_item nfsi ON i.iditem = nfsi.iditem 
JOIN nfs ON nfsi.idnfs = nfs.idnfs
JOIN grupo gp ON i.idgrupo = gp.idgrupo 
JOIN cfop ON nfs.idcfop = cfop.idcfop 
JOIN projeto pro ON nfs.idprojeto = pro.idprojeto 
WHERE gp.idgrupo IN ('143', '163') 
  AND nfs.status IN ('2') 
  AND cfop.idcfop IN (5101, 6101, 6922, 5922, 5107, 6107, 5949, 6949, 5116, 6116) 
  AND nfs.numeroprojeto = $1 
  AND nfs.dataemissao BETWEEN $2 AND $3
GROUP BY pro.idprojeto, pro.descricao, nfs.numeroprojeto,i.referencia1, i.referencia2, i.referencia3, gp.descricao;
`;

        const sqlDevolucao = `SELECT 
    pro.idprojeto,
    pro.descricao,
    nfe.numeroprojeto,
    i.referencia3, 
    i.descricao AS descricao_item, 
    gp.descricao AS grupo, 
    COALESCE(SUM(nfei.qt), 0) AS qt_total, 
    COALESCE(SUM(nfei.valortotal) / NULLIF(SUM(nfei.qt), 0), 0) AS valor_uni, 
    COALESCE(SUM(nfei.valortotal), 0) AS valor_total
FROM item i 
JOIN nfe_item nfei ON i.iditem = nfei.iditem 
JOIN nfe ON nfei.idnfe = nfe.idnfe
JOIN grupo gp ON i.idgrupo = gp.idgrupo 
JOIN cfop ON nfe.idcfop = cfop.idcfop 
JOIN projeto pro ON nfe.idprojeto = pro.idprojeto 
WHERE gp.idgrupo IN ('143', '163') 
AND nfe.status IN ('2') 
AND cfop.idcfop in (1949, 2949, 1201, 1101, 2201, 1107, 1207, 2107, 2207)
AND nfe.numeroprojeto = $1 
AND nfe.dataemissao BETWEEN $2 AND $3
GROUP BY pro.idprojeto, pro.descricao, nfe.numeroprojeto,i.referencia1, i.referencia2, i.referencia3, i.descricao, gp.descricao`;


        const sqlNotas = `SELECT  
    SUM(nfsi.valor_total) AS valor_total,
    nfs.idcfop,
    nfs.numeronf,
    nfs.dataemissao 
FROM item i 
JOIN nfs_item nfsi ON i.iditem = nfsi.iditem 
JOIN nfs ON nfsi.idnfs = nfs.idnfs
JOIN grupo gp ON i.idgrupo = gp.idgrupo 
JOIN nfs_transacao nfst ON nfs.idtransacao = nfst.idtransacao 
JOIN cfop ON nfs.idcfop = cfop.idcfop 
JOIN condicaopagto cdp ON nfs.idcondicao = cdp.idcondicao
JOIN projeto pro ON nfs.idprojeto = pro.idprojeto 
WHERE gp.idgrupo IN ('143', '163') 
AND nfs.status IN ('2') 
AND cfop.idcfop IN (5101, 6101, 6922, 5922, 5107, 6107, 5949, 6949) 
and nfs.numeroprojeto = $1 
AND nfs.dataemissao BETWEEN $2 AND $3
GROUP BY nfs.idcfop, nfs.numeronf, nfs.dataemissao;`;

        const sqlNotasRemessa = `SELECT  
    SUM(nfsi.valor_total) AS valor_total,
    nfs.idcfop,
    nfs.numeronf,
    nfs.dataemissao 
FROM item i 
JOIN nfs_item nfsi ON i.iditem = nfsi.iditem 
JOIN nfs ON nfsi.idnfs = nfs.idnfs
JOIN grupo gp ON i.idgrupo = gp.idgrupo 
JOIN nfs_transacao nfst ON nfs.idtransacao = nfst.idtransacao 
JOIN cfop ON nfs.idcfop = cfop.idcfop 
JOIN condicaopagto cdp ON nfs.idcondicao = cdp.idcondicao
JOIN projeto pro ON nfs.idprojeto = pro.idprojeto 
WHERE gp.idgrupo IN ('143', '163') 
AND nfs.status IN ('2') 
AND cfop.idcfop IN (5116, 6116) 
and nfs.numeroprojeto = $1 
AND nfs.dataemissao BETWEEN $2 AND $3
GROUP BY nfs.idcfop, nfs.numeronf, nfs.dataemissao;`;

        const sqlValorAproxContratado = `SELECT valor_aprox from projeto where numero = $1`;

        const sqlValorRecebido = `
        SELECT SUM(DADOS.VALORRECEBIDO) AS valor_recebido
        FROM (
            SELECT 1 AS TIPO,
                'Contas recebidas' AS DESC_TIPO,
                '1' AS cod_tipo,             
                RECEBER.DATA_ULT_COBRANCA, 
                CASE RECEBER.ORIGEM
                    WHEN 1 THEN 
                        CASE NFS_TRANSACAO.TIPONF_E 
                            WHEN 0 THEN CAST(NFS.NUMERONF AS VARCHAR)
                            WHEN 1 THEN CAST(NFS.NUMERONF_SERVICO AS VARCHAR)
                            ELSE RECEBER.DOCUMENTO
                        END 
                    ELSE RECEBER.DOCUMENTO
                END AS DOCUMENTO, 
                RECEBER.DATAEMISSAO, 
                RECEBER.PARCELA,
                RECEBER.IDFILIAL,
                RECEBER.VALORORIGINAL,
                RECEBER.VENCIMENTO,
                RECEBER.numeroprojeto,
                RECEBER.IDVENDREPRE,
                RECEBER.TIPOCLIFOREMP,
                RECEBER_BAIXA.DATA,
                RECEBER_BAIXA.IDBAIXA,
                RECEBER.OBSERVACAO,
                RECEBER_BAIXA_TITULO.IDCLIFOREMP,
                RECEBER_BAIXA_TITULO.VALORDESCONTO, 
                RECEBER_BAIXA_TITULO.VALORJUROS,
                RECEBER_BAIXA_TITULO.VALORRECEBIDO, 
                CLIFOREMP.FANTASIA,
                CONTASFINANCEIRAS.DESCRICAO AS CONTAFINANCEIRA
            FROM RECEBER_BAIXA_TITULO
            JOIN RECEBER_BAIXA ON RECEBER_BAIXA.IDBAIXA = RECEBER_BAIXA_TITULO.IDBAIXA
            JOIN CONTASFINANCEIRAS ON CONTASFINANCEIRAS.IDCONTA = RECEBER_BAIXA.IDCONTACX
            JOIN RECEBER ON RECEBER.IDRECEBER = RECEBER_BAIXA_TITULO.IDRECEBER
            JOIN CLIFOREMP ON CLIFOREMP.IDCLIFOREMP = RECEBER_BAIXA_TITULO.IDCLIFOREMP 
            JOIN METODOPAGTO ON METODOPAGTO.IDMETODO = RECEBER_BAIXA.IDMETODO
            LEFT JOIN NFS ON RECEBER.IDNFS = NFS.IDNFS
            LEFT JOIN NFS_TRANSACAO ON NFS.IDTRANSACAO = NFS_TRANSACAO.IDTRANSACAO
            WHERE RECEBER.EXCLUIDO = 'N' 
              AND RECEBER.SIMULACAO = 'N' 
              AND RECEBER_BAIXA.IDTRANSACAOBAIXA NOT IN (5)
            UNION ALL
            SELECT 2 AS TIPO,
                'Adiantamento' AS DESC_TIPO,
                '2' AS cod_tipo,  
                '1900-01-01' AS DATA_ULT_COBRANCA,
                CAST(AD.IDADIANTAMENTO AS VARCHAR) AS DOCUMENTO,
                AD.DATA AS DATAEMISSAO,
                1 AS PARCELA,
                AD.IDFILIAL,
                0 AS VALORORIGINAL,
                '1900-01-01' AS VENCIMENTO,
                AD.pex_numero_projeto AS numeroprojeto,
                AD.PEX_IDVENDREPRE AS IDVENDREPRE,
                AD.TIPOCLIFOREMP,
                AD.DATA,
                0 AS IDBAIXA,
                AD.OBSERVACAO,
                AD.IDCLIFOREMP,
                0 AS VALORDESCONTO,
                0 AS VALORJUROS,
                AD.VALOR AS VALORRECEBIDO,
                CF.FANTASIA,
                CONTASFINANCEIRAS.DESCRICAO AS CONTAFINANCEIRA
            FROM ADIANTAMENTO AD
            JOIN CLIFOREMP CF ON CF.IDCLIFOREMP = AD.IDCLIFOREMP
            LEFT JOIN CLIFOREMP CF1 ON CF1.IDCLIFOREMP = AD.PEX_IDVENDREPRE
            JOIN CONTASFINANCEIRAS ON CONTASFINANCEIRAS.IDCONTA = AD.IDCONTAFINANC
            JOIN PROJETO PJ ON PJ.IDPROJETO = AD.PEX_IDPROJETO
            WHERE AD.STATUS <> 3
        ) DADOS
        WHERE DADOS.numeroprojeto = $1;`;

        const sqlNotasDevolucaoEntrada = `SELECT SUM(nfei.valortotal) AS valor_total,
        nfe.idcfop,
        nfe.numero,
        nfe.dataemissao 
    FROM item i 
    JOIN nfe_item nfei ON i.iditem = nfei.iditem 
    JOIN nfe ON nfei.idnfe = nfe.idnfe
    JOIN grupo gp ON i.idgrupo = gp.idgrupo 
    JOIN nfe_transacao nfet ON nfe.idtransacao = nfet.idtransacao 
    JOIN cfop ON nfe.idcfop = cfop.idcfop 
    JOIN condicaopagto cdp ON nfe.idcondicao = cdp.idcondicao
    JOIN projeto pro ON nfe.idprojeto = pro.idprojeto 
    WHERE gp.idgrupo IN ('143', '163') 
    AND nfe.status IN ('2') 
    AND cfop.idcfop IN (1949, 2949, 1201, 1101, 2201, 1107, 1207, 2107, 2207) 
    and nfe.numeroprojeto = $1 
    AND nfe.dataemissao BETWEEN $2 AND $3
    GROUP BY nfe.idcfop, nfe.numero, nfe.dataemissao;`;

        const sqlPaginaInicial = `SELECT p.idprojeto, p.descricao as descricao_obra, p.numero as numero_obra_contrato, cfe.razao  
            FROM projeto p
            JOIN cliforemp cfe ON p.idcliforemp = cfe.idcliforemp 
            WHERE p.numero = $1
        `;

        const expedicao = (await pgPool.query(sqlExpedicao, [numeroprojeto, datainicial, datafinal])).rows || [];
        const devolucao = (await pgPool.query(sqlDevolucao, [numeroprojeto, datainicial, datafinal])).rows || [];
        const notas = (await pgPool.query(sqlNotas, [numeroprojeto, datainicial, datafinal])).rows || [];
        const notasRemessa = (await pgPool.query(sqlNotasRemessa, [numeroprojeto, datainicial, datafinal])).rows || [];
        const valoraproxcontratado = (await pgPool.query(sqlValorAproxContratado, [numeroprojeto])).rows || [];
        const valorRecebido = (await pgPool.query(sqlValorRecebido)).rows || [];
        const NotasDevolucaoEntrada = (await pgPool.query(sqlNotasDevolucaoEntrada, [numeroprojeto, datainicial, datafinal])).rows || [];
        const paginaInicial = (await pgPool.query(sqlPaginaInicial, [numeroprojeto])).rows || [];

        res.json({ expedicao, devolucao, notas, notasRemessa, valoraproxcontratado, valorRecebido, NotasDevolucaoEntrada, paginaInicial });

    } catch (error) {
        console.error("❌ Erro ao buscar relatório:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});


router.get("/projetadas", async (req, res) => {
    try {
        const { ano, mes, sigla } = req.query;

        if (!ano || !mes || !sigla) {
            return res.status(400).json({ error: 'Parâmetros ano, mes e sigla são obrigatórios' });
        }
        const dataInicial = `01/${String(mes).padStart(2, "0")}/${ano}`;
        const lastDay = new Date(ano, mes, 0).getDate();
        const dataFinal = `${lastDay}/${String(mes).padStart(2, "0")}/${ano}`;

        const response = await axios.get("http://179.124.195.91:1890/ADM_BPM/api/bi/obras", {
            params: { dataInicial, dataFinal, sigla },
        });

        res.json(response.data);
    } catch (err) {
        console.error("Erro ao buscar dados projetados:", err.message);
        res.status(500).json({ error: "Erro ao buscar dados projetados" });
    }
});


router.get("/obras", async (req, res) => {
    try {
        let { dataInicial, dataFinal, sigla } = req.query;

        if (!dataInicial || !dataFinal || !sigla) {
            return res.status(400).json({ error: "Parâmetros dataInicial, dataFinal e sigla são obrigatórios" });
        }

        // Garante que as datas estejam no formato YYYY-MM-DD
        const formatarData = (data) => {
            const [dia, mes, ano] = data.split("/");
            return `${ano}-${mes}-${dia}`;
        };

        dataInicial = formatarData(dataInicial);
        dataFinal = formatarData(dataFinal);

        console.log("🔍 Parâmetros enviados:", { dataInicial, dataFinal, sigla });

        const response = await axios.get("http://179.124.195.91:1890/ADM_BPM/api/bi/obras", {
            params: { dataInicial, dataFinal, sigla }
        });

        const obrasFinalizadas = response.data.filter((obra) => obra.status === "FINALIZADA");

        res.json(obrasFinalizadas);
    } catch (error) {
        console.error("Erro ao buscar obras:", error);
        res.status(500).json({ error: "Erro ao buscar dados de obras" });
    }
});



module.exports = router;
