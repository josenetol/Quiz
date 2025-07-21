const fetishQuestions = [
    {
        id: 1,
        "question": "Você tem algum fetiche que ainda não contou pra ninguém?",
        "description": "Compartilhe algo que você realmente deseja alcançar, mas talvez nunca tenha tido coragem de revelar.",
        "category": "Fetiches e Desejos"
    },
    {
        id: 2,
        "question": "Já sentiu atração por alguma coisa fora do comum?",
        "description": "Conte sobre um desejo inesperado ou algo que despertou seu interesse de forma inusitada.",
        "category": "Fetiches e Desejos"
    },
    {
        id: 3,
        "question": "Alguma vez um cheiro específico te deixou excitado(a)?",
        "description": "Fale sobre aromas que despertam sua imaginação ou sensações intensas.",
        "category": "Fetiches e Desejos"
    },
    {
        id: 4,
        "question": "Qual a peça de roupa que mais te excita ver em alguém?",
        "description": "Descreva o visual ou estilo que te faz perder o controle.",
        "category": "Fetiches e Desejos"
    },
    {
        id: 5,
        "question": "Você gosta de assumir o controle ou ser dominado(a)?",
        "description": "Explique como você se sente em posições de poder ou submissão durante momentos íntimos.",
        "category": "Fetiches e Desejos"
    },
    {
        id: 6,
        "question": "Já sentiu tesão por pés ou alguma parte do corpo diferente?",
        "description": "Revele se alguma parte do corpo fora do óbvio te desperta desejos.",
        "category": "Fetiches e Desejos"
    },
    {
        id: 7,
        "question": "Tem vontade de experimentar alguma fantasia com roupas específicas?",
        "description": "Compartilhe se uniformes, latex, couro ou algo inusitado já te despertaram curiosidade.",
        "category": "Fetiches e Desejos"
    },
    {
        id: 8,
        "question": "Usaria vendas ou algemas na cama?",
        "description": "Fale sobre sua disposição para explorar jogos sensoriais e de confiança.",
        "category": "Fetiches e Desejos"
    },
    {
        id: 9,
        "question": "Já sentiu tesão em situações de risco ou lugares públicos?",
        "description": "Descreva se o perigo ou o inesperado te causam excitação.",
        "category": "Fetiches e Desejos"
    },
    {
        id: 10,
        "question": "Ser observado(a) ou observar te excita mais?",
        "description": "Explore seu lado voyeur ou exibicionista — qual deles te atrai mais?",
        "category": "Fetiches e Desejos"
    },
    {
        id: 11,
        "question": "Você tem interesse em BDSM ou já pesquisou sobre?",
        "description": "Conte se já mergulhou nesse universo e o que te chamou mais atenção.",
        "category": "Fetiches e Desejos"
    },
    {
        id: 12,
        "question": "Que tipo de dor ou pressão você considera excitante?",
        "description": "Revele se existe alguma sensação física mais intensa que te estimula.",
        "category": "Fetiches e Desejos"
    },
    {
        id: 13,
        "question": "Já se excitou com palavras mais sujas ou humilhação leve?",
        "description": "Explique se jogos psicológicos e linguagem ousada têm um efeito em você.",
        "category": "Fetiches e Desejos"
    },
    {
        id: 14,
        "question": "Tem algum fetiche que te dá vergonha de contar?",
        "description": "Compartilhe aquele segredo que ainda está guardado por medo de julgamento.",
        "category": "Fetiches e Desejos"
    },
    {
        id: 15,
        "question": "Você toparia ser amarrado(a), vendado(a) e sem saber o que vai acontecer?",
        "description": "Descreva como se sente diante da entrega total ao parceiro(a), sem controle da situação.",
        "category": "Fetiches e Desejos"
    }
];

// Função para obter perguntas aleatórias
function getRandomQuestions(count = 10) {
    const shuffled = [...fetishQuestions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}