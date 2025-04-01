// --- Configurações Iniciais ---
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Seleciona o SVG e define seu tamanho
const svg = d3.select("#visualization")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

// Cria um grupo principal ('g') para aplicar as margens
const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Container para os pontos (para o zoom funcionar corretamente)
const plotArea = g.append("g")
    .attr("clip-path", "url(#clip)"); // Define área de recorte

// Define a área de recorte para que os pontos não saiam do gráfico com zoom/pan
g.append("defs").append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", width)
    .attr("height", height);

// Tooltip (opcional, mas bom para interatividade)
const tooltip = d3.select("#tooltip");

// --- Escalas ---
const xScale = d3.scaleLinear().range([0, width]);
const yScale = d3.scaleLinear().range([height, 0]);
const colorScale = d3.scaleOrdinal(d3.schemeCategory10); // Escala de cores para categorias
const radiusScale = d3.scaleSqrt().range([3, 15]); // Escala para o tamanho (sqrt é bom para área)

// --- Eixos ---
const xAxisGroup = g.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", `translate(0,${height})`);

const yAxisGroup = g.append("g")
    .attr("class", "axis axis--y");

// --- Carregamento de Dados ---
d3.csv("dados.csv", d => {
    // Converte os valores para números onde necessário
    d.valorX = +d.valorX;
    d.valorY = +d.valorY;
    d.tamanho = +d.tamanho;
    return d;
}).then(data => {
    console.log("Dados carregados:", data);

    // --- Define os Domínios das Escalas com base nos Dados ---
    xScale.domain([0, d3.max(data, d => d.valorX) * 1.1]); // Um pouco de folga
    yScale.domain([0, d3.max(data, d => d.valorY) * 1.1]);
    colorScale.domain([...new Set(data.map(d => d.categoria))]); // Pega categorias únicas
    radiusScale.domain([0, d3.max(data, d => d.tamanho)]);

    // --- Desenha os Eixos ---
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);
    xAxisGroup.call(xAxis);
    yAxisGroup.call(yAxis);

    // --- Desenha os Pontos (Data Binding) ---
    const circles = plotArea.selectAll(".dot")
        .data(data, d => d.id); // Usar ID como chave é bom para transições

    circles.enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.valorX))
        .attr("cy", d => yScale(d.valorY))
        .attr("r", d => radiusScale(d.tamanho))
        .attr("fill", d => colorScale(d.categoria))
        .attr("fill-opacity", 0.7)
        .each(function(d) {
            d.clicks = 0; // Contador de cliques individual para cada círculo
        })
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`ID: ${d.id}<br>X: ${d.valorX}<br>Y: ${d.valorY}<br>Cat: ${d.categoria}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            d3.select(event.currentTarget).raise().classed("highlighted", true);
        })
        .on("mouseout", (event, d) => {
            tooltip.transition().duration(500).style("opacity", 0);
            d3.select(event.currentTarget).classed("highlighted", false);
        })
        // Evento de Clique para Aumentar Progressivamente e Resetar Após 5 Cliques
        .on("click", function(event, d) { 
            d.clicks += 1; // Incrementa o contador de cliques
            
            const circle = d3.select(this);
            const baseRadius = radiusScale(d.tamanho);
            
            if (d.clicks < 5) {
                // Aumenta progressivamente
                circle.transition()
                    .duration(500)
                    .attr("r", baseRadius * (1 + d.clicks * 0.5));
            } else {
                // Reseta suavemente
                d.clicks = 0; // Reinicia o contador
                circle.transition()
                    .duration(1000) // Suaviza o retorno ao tamanho original
                    .attr("r", baseRadius);
            }
        });

    // --- REQUISITO: Legenda ---
    createLegend(d3.select("#legend"), colorScale);

}).catch(error => {
    console.error("Erro ao carregar ou processar os dados:", error);
});

// --- Função para Criar a Legenda ---
function createLegend(legendContainer, colorScale) {
    const legendSvg = legendContainer.append("svg")
        .attr("height", colorScale.domain().length * 20 + 10)
        .attr("width", 150);

    const legend = legendSvg.selectAll(".legend-item")
        .data(colorScale.domain())
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20 + 10})`);

    legend.append("rect")
        .attr("x", 0)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", colorScale);

    legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .text(d => `Categoria ${d}`);
}
