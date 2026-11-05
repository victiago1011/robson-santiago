export type PanoramaNews = {
  slug: string;
  category: string;
  title: string;
  description: string;
  impact: string;
  body: string[];
  source: string;
};

export const panoramaEdition = {
  number: "003",
  date: "5 de novembro de 2026",
  marketReference: "4 de novembro de 2026",
  headline: "Juros, cenário internacional e confiança nos mercados",
};

export const marketSnapshot = [
  { label: "Ibovespa", value: "167.563 pts", change: "▲ 1,23%", positive: true, description: "Índice de referência da Bolsa brasileira." },
  { label: "Dólar", value: "R$ 5,45", change: "▼ 0,64%", positive: true, description: "Cotação do dólar comercial informada no material." },
  { label: "Euro", value: "R$ 6,12", change: "▼ 0,35%", positive: true, description: "Cotação do euro comercial informada no material." },
  { label: "Selic", value: "13,75% a.a.", change: "No material", positive: null, description: "Taxa básica de juros. Dado sujeito à conferência." },
  { label: "Bitcoin", value: "R$ 440.867", change: "▲ 3,86%", positive: true, description: "Cotação de referência informada na edição." },
  { label: "Ouro / g", value: "R$ 712,99", change: "▲ 2,58%", positive: true, description: "Cotação por grama informada na edição." },
] as const;

export const panoramaCategories = [
  "Todas",
  "Brasil",
  "Mundo",
  "Economia & Mercados",
  "Política",
  "Negócios",
  "Santa Catarina",
] as const;

export const panoramaNews: PanoramaNews[] = [
  {
    slug: "copom-juros",
    category: "Economia & Mercados",
    title: "Banco Central e os desafios de uma política de juros elevados",
    description: "A edição comenta a decisão do Copom e os efeitos da política monetária sobre famílias, empresas e investimentos.",
    impact: "Juros elevados encarecem o crédito e tornam decisões de investimento e planejamento de caixa mais sensíveis ao risco.",
    body: [
      "O panorama desta edição dedica atenção à trajetória dos juros brasileiros e às preocupações com as expectativas de inflação e as contas públicas.",
      "O tema interessa tanto a quem investe quanto a quem administra empresas: custo do crédito, capital de giro e horizonte de decisões são diretamente afetados pela política monetária.",
      "Esta é uma adaptação de demonstração do texto enviado. Antes de divulgar fatos e números, o editor deverá conferir os dados nas fontes oficiais.",
    ],
    source: "Material-base do Panorama 360° — edição 003",
  },
  {
    slug: "politica-estados-unidos",
    category: "Mundo",
    title: "Mudanças políticas nos Estados Unidos entram no radar dos mercados",
    description: "Um olhar sobre eleições, custo de vida e possíveis reflexos para relações comerciais internacionais.",
    impact: "Mudanças no equilíbrio político podem afetar expectativas sobre comércio, tarifas e mercados — sem produzir efeitos automáticos.",
    body: [
      "O cenário político americano aparece entre os destaques internacionais selecionados para a edição.",
      "O texto propõe acompanhar como decisões institucionais se relacionam com inflação, comércio internacional e confiança dos investidores.",
      "As informações eleitorais do material original não foram verificadas nesta demonstração.",
    ],
    source: "Material-base do Panorama 360° — edição 003",
  },
  {
    slug: "paraguai-sistema-bancario",
    category: "Mundo",
    title: "Riscos bancários e governança: o caso do Paraguai",
    description: "A edição analisa a importância da solidez institucional para empresas e investidores que atuam fora do Brasil.",
    impact: "Benefícios tributários não eliminam riscos de crédito, liquidez, supervisão e governança.",
    body: [
      "A análise explora o cuidado necessário ao avaliar oportunidades em mercados vizinhos.",
      "Custos menores podem ser atraentes, mas é fundamental considerar a regulação e a capacidade das instituições financeiras locais.",
      "Os fatos específicos mencionados no documento precisam de checagem editorial antes de publicação.",
    ],
    source: "Material-base do Panorama 360° — edição 003",
  },
  {
    slug: "reforma-tributaria",
    category: "Brasil",
    title: "Reforma tributária e impactos para empresas e consumidores",
    description: "Novas regras exigem atenção às cadeias de produção, aos preços e às margens empresariais.",
    impact: "Mudanças tributárias podem alterar planejamento, precificação e decisões de investimento.",
    body: [
      "A edição coloca a transição tributária entre os temas centrais para o ambiente de negócios.",
      "Para empresários, acompanhar cronogramas e regras aplicáveis ao setor é uma forma de reduzir surpresas operacionais.",
    ],
    source: "Material-base do Panorama 360° — edição 003",
  },
  {
    slug: "inteligencia-artificial-negocios",
    category: "Negócios",
    title: "Como a inteligência artificial está mudando a descoberta de empresas",
    description: "Buscas, reputação digital e novas jornadas de compra transformam a relação entre marcas e consumidores.",
    impact: "A presença digital precisa responder às novas formas de pesquisa e decisão, sem depender apenas de anúncios e cliques.",
    body: [
      "O Panorama destaca mudanças no comportamento de busca provocadas por ferramentas de inteligência artificial.",
      "Em vez de se apoiar apenas em posições nos buscadores, empresas precisam produzir informações úteis, confiáveis e fáceis de encontrar.",
    ],
    source: "Material-base do Panorama 360° — edição 003",
  },
  {
    slug: "santa-catarina-clima",
    category: "Santa Catarina",
    title: "Eventos climáticos e seus efeitos econômicos no Sul",
    description: "Infraestrutura, logística e continuidade operacional fazem parte do custo econômico de fenômenos extremos.",
    impact: "Planejar a continuidade das operações e proteger infraestrutura tornou-se uma questão estratégica.",
    body: [
      "A edição regional chama atenção para impactos econômicos de eventos climáticos severos.",
      "Os riscos vão além dos danos imediatos: transporte, abastecimento e operação de empresas também podem ser afetados.",
    ],
    source: "Material-base do Panorama 360° — edição 003",
  },
  {
    slug: "politica-fiscal",
    category: "Política",
    title: "Confiança fiscal permanece no centro do debate econômico",
    description: "Expectativas sobre as contas públicas influenciam taxas de juros, câmbio e o custo de financiamento.",
    impact: "Credibilidade fiscal e previsibilidade afetam decisões de agentes econômicos.",
    body: [
      "O documento original discute a relação entre sinalizações de política econômica e a confiança dos mercados.",
      "A análise apresenta o tema em linguagem acessível a leitores que acompanham os impactos das decisões públicas na economia.",
    ],
    source: "Material-base do Panorama 360° — edição 003",
  },
];

export const panoramaAgenda = [
  { date: "05 NOV", title: "Repercussões sobre juros e cenário internacional", subtitle: "Acompanhar notícias e análises" },
  { date: "08 NOV", title: "Agenda de política fiscal", subtitle: "Evento previsto no material-base; confirmar" },
  { date: "27 NOV", title: "Black Friday", subtitle: "Consumo, comércio e margens empresariais" },
];

export const panoramaHistory = [
  { year: "1605", event: "Conspiração da Pólvora, na Inglaterra" },
  { year: "1940", event: "Franklin D. Roosevelt é eleito para um terceiro mandato" },
  { year: "2015", event: "Tragédia de Mariana, em Minas Gerais" },
];
