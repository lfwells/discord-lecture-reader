"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SURVEY_QUESTIONS = exports.LIKERT_OPTIONS = exports.ARCHETYPES = void 0;
exports.ARCHETYPES = [
    {
        id: "task_expeditor",
        goal: "My goal is to: expedite a solution for an immediate, simple task without a significant investment of time or mental energy",
        displayName: "AI Discoverer",
        description: "You focus on quick wins and immediate problem-solving, using AI for straightforward tasks efficiently."
    },
    {
        id: "capability_enhancer",
        goal: "My goal is to: systematically enhance my personal and professional capabilities to produce higher quality outcomes more efficiently",
        displayName: "AI Intentional Adopter",
        description: "You aim to leverage AI for personal and professional growth, consistently improving your skills and output quality."
    },
    {
        id: "process_integrator",
        goal: "My goal is to: embed AI-driven efficiencies and capabilities into my  core processes",
        displayName: "AI Integrator",
        description: "You seek to weave AI into existing workflows and systems, significantly boosting operational effectiveness and streamlining tasks."
    },
    {
        id: "organizational_transformer",
        goal: "My goal is to: catalyse and guide the organization's transformation into an AI-native entity to secure its future relevance and competitiveness",
        displayName: "AI Advocate",
        description: "You drive strategic, large-scale AI adoption to reshape an entire organization, ensuring its future success and competitive edge."
    },
    {
        id: "foundational_innovator",
        goal: "My goal is to: develop the fundamental capabilities of artificial intelligence to create new forms.",
        displayName: "AI Expert",
        description: "You explore the frontiers of AI, dedicated to creating novel AI capabilities, pioneering new forms and applications of intelligence."
    }
];
exports.LIKERT_OPTIONS = [
    { text: "Very Confident", value: 5 },
    { text: "Confident", value: 4 },
    { text: "Neutral", value: 3 },
    { text: "Not Very Confident", value: 2 },
    { text: "Not At All Confident", value: 1 },
];
exports.SURVEY_QUESTIONS = {
    task_expeditor: [
        "I can define what Artificial Intelligence (AI), Machine Learning (ML), and Deep Learning (DL) are.",
        "I understand that ML is a type of AI and DL is a type of ML.",
        "I recognize that data is essential for AI systems to function.",
        "I understand that the quality of data affects how well AI performs.",
        "I understand what an algorithm is in simple terms.",
        "I can explain that algorithms are sets of rules that computers follow.",
        "I am aware that AI can be biased or make mistakes.",
        "I can reflect on how AI might affect people’s lives or jobs.",
        "I have used AI tools like chatbots, translators, or recommendation systems.",
        "I understand that AI tools are not perfect and may need human input.",
        "I understand how AI is used in social media and everyday apps.",
        "I am aware of the ethical issues related to AI, such as privacy and fairness.",
        "I can use AI tools safely and effectively in my daily life.",
        "I follow basic safety practices when using AI tools (e.g., not sharing personal data).",
        "I can identify examples of AI in my daily life (e.g., Netflix recommendations, Google Maps).",
        "I understand that AI systems learn from data and make predictions or decisions.",
        "I know that AI can sometimes produce unfair or inaccurate results.",
        "I am aware of the risks of automation and AI bias.",
        "I understand that AI is not a person—it’s a tool that learns from input.",
        "I can use a basic AI tool (e.g., chatbot or translator) to complete a simple task.",
        "I can question whether an AI-generated result is accurate or fair.",
        "I can ask a search engine or chatbot a basic question about AI (e.g., “What is AI bias?”).",
        "I can identify AI-driven features in apps I use (e.g., “recommended for you” sections).",
        "I can reflect on how an AI tool helped or frustrated me in a specific situation.",
        "I can follow simple instructions to use an AI tool effectively."
    ],
    capability_enhancer: [
        "I can explain the difference between supervised, unsupervised, and reinforcement learning.",
        "I understand how AI systems process data, train models, and make predictions.",
        "I understand what data bias is and how it can affect AI outcomes.",
        "I am aware of privacy risks when using data in AI systems.",
        "I know how AI models are trained and tested using different datasets.",
        "I understand the concepts of fairness and explainability in AI.",
        "I know how to write effective prompts to guide AI tools.",
        "I am aware of the limitations of AI, such as hallucinations or bias.",
        "I understand how AI influences the content I see online.",
        "I can use advanced AI tools and features to improve my productivity.",
        "I can describe the basic workflow of an AI system (data ingestion, training, prediction, feedback).",
        "I understand how biased or non-representative data can lead to unfair AI outcomes.",
        "I know that AI models are evaluated using separate test datasets before deployment.",
        "I understand how algorithmic content curation affects my news and media consumption.",
        "I am aware of the societal consequences of AI-driven personalization.",
        "I can explain how a recommendation engine works using data and predictive modeling.",
        "I can identify potential sources of bias in an AI application.",
        "I can write and refine prompts to get better results from AI tools.",
        "I can critique AI outputs for fairness, accuracy, and bias.",
        "I can discuss ethical trade-offs in AI implementations.",
        "I can use advanced features in AI tools, such as model selection or parameter tuning.",
        "I can integrate AI tools into my personal or professional workflows.",
        "I can question why certain AI-generated content is shown to me and seek alternative views."
    ],
    process_integrator: [
        "I can distinguish between different types of machine learning models and understand their strengths and weaknesses.",
        "I understand the principles of data preprocessing and feature engineering for machine learning.",
        "I know the steps involved in the machine learning lifecycle and understand key performance metrics.",
        "I understand ethical AI frameworks and know how to audit and mitigate bias in AI systems.",
        "I understand user-centered design principles and how to design feedback loops for AI systems.",
        "I understand the policy and governance structures needed for responsible AI implementation.",
        "I can build or adapt AI systems for specific tasks or domains.",
        "I know the architectural differences between various machine learning models (e.g., regression vs. classification).",
        "I understand how to clean, normalize, and transform raw data for machine learning.",
        "I understand model selection, training, validation, and testing processes.",
        "I understand fairness, accountability, and transparency principles in AI.",
        "I know how to design user interfaces that support AI feedback mechanisms.",
        "I understand the societal and organizational implications of responsible AI.",
        "I can analyze the performance of different AI models and select the most appropriate one.",
        "I can perform basic data cleaning and preparation using common tools or libraries.",
        "I can use ML platforms or libraries (e.g., TensorFlow, PyTorch, Scikit-learn) to train and deploy models.",
        "I can conduct a bias assessment and implement fairness measures in AI projects.",
        "I can design or prototype user interfaces that include feedback mechanisms for AI systems.",
        "I can advocate for responsible AI practices and communicate risks and benefits to stakeholders.",
        "I can adapt and integrate pre-existing AI models into broader applications or workflows."
    ],
    organizational_transformer: [
        "I can align AI capabilities with core business objectives.",
        "I understand the components of a multi-year AI roadmap (talent, technology, data, process change).",
        "I can develop and articulate a compelling AI vision and strategic roadmap for the organization.",
        "I understand legal, regulatory, and ethical frameworks governing data use (e.g., GDPR).",
        "I know how to create robust data governance policies for data quality, security, and compliance.",
        "I understand model risk at a portfolio level and strategic trade-offs in AI solution sourcing.",
        "I know how to establish an organizational AI governance body and corporate AI policy.",
        "I understand strategic models for human-in-the-loop (HITL) design and their workflow impact.",
        "I understand the organization's narrative in public and regulatory AI discourse.",
        "I know the criteria for evaluating AI vendors and managing an AI R&D portfolio.",
        "I can design and implement a comprehensive data and AI governance framework.",
        "I can oversee and evaluate the organization's AI model portfolio and manage associated risks.",
        "I can shape and ratify corporate AI policies with legal, compliance, and technology teams.",
        "I can make strategic decisions on HITL system implementation and team restructuring.",
        "I can represent the organization's AI strategy and ethics in public and regulatory forums.",
        "I can lead AI innovation by directing R&D, selecting vendors, and fostering experimentation."
    ],
    foundational_innovator: [
        "I can align AI capabilities with core business objectives and develop a multi-year AI roadmap.",
        "I understand the legal, regulatory, and ethical frameworks governing data use and can design governance policies.",
        "I can evaluate model risk at a portfolio level and make strategic decisions about AI deployment.",
        "I can establish and shape corporate AI policies and governance structures.",
        "I can design strategic human-in-the-loop systems and restructure workflows accordingly.",
        "I understand the organization's role in public AI discourse and can represent it effectively.",
        "I can lead AI R&D, vendor evaluations, and innovation pipelines.",
        "I understand the mathematical and theoretical principles of machine learning architectures.",
        "I understand advanced data structures, database technologies, and data pipeline architectures.",
        "I understand how to design novel algorithms and model architectures from scratch.",
        "I understand advanced ethical concepts like differential privacy and causal inference.",
        "I understand human-computer interaction principles for AI collaboration and trust.",
        "I understand the strategic landscape of the AI industry and its market implications.",
        "I know the full-stack AI development ecosystem including MLOps and cloud infrastructure.",
        "I can design and build custom AI solutions for novel or complex problems.",
        "I can translate organizational strategy into a technical AI roadmap and R&D plan.",
        "I can debug and troubleshoot complex AI model issues using first-principles knowledge.",
        "I can contribute to AI thought leadership through research, publications, or patents.",
        "I can communicate technical AI concepts to executive audiences for strategic influence.",
        "I can rapidly prototype and validate new AI ideas from concept to proof-of-concept.",
        "I can mentor and develop talent within the AI team to elevate technical capabilities."
    ]
};
