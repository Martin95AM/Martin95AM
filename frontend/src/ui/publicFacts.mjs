// Resumen profesional del CV compartido por Martín, redactado para visitantes.
// No incluir segundo nombre/apellido, documentos, CUIT, domicilio, teléfono ni correo.
export const PUBLIC_FACTS = [
    {
        triggers: ['todos los datos', 'todo lo que sabes', 'resumen de martin', 'perfil de martin', 'curriculum', 'cv de martin', 'presentame a martin', 'hablame de martin', 'contame de martin'],
        answer: 'Martín Arias combina tecnología y audio. Según su CV de 2026, cursaba la Licenciatura en Inteligencia Artificial y Robótica en la Universidad Siglo 21 y es Técnico en Grabación y Postproducción de Audio. Trabajó en informática y audio en Nipper Estudios (2021–2026), en sonido en El Emergente (2018–2019) y en grabación en Estudios del Parral (2017–2021); también realizó tareas administrativas. Se formó en Full Stack Java, Python 3, testing y análisis financiero. Habla inglés, italiano y alemán, sin nivel informado. Su GitHub público es Martin95AM.',
        alternative: 'Si tuviera que resumirlo: Martín Arias viene del mundo del audio y también se formó en tecnología. Su CV de 2026 menciona estudios de Inteligencia Artificial y Robótica en la Universidad Siglo 21, el título de Técnico en Grabación y Postproducción de Audio y experiencia en Nipper Estudios, El Emergente y Estudios del Parral. Además, hizo cursos de Java, Python, testing y finanzas. Habla inglés, italiano y alemán, aunque no indica niveles.'
    },
    {
        triggers: ['quien es martin', 'quien es martin arias', 'nombre de martin', 'como se llama martin', 'cual es su nombre', 'su nombre'],
        answer: 'Su nombre público es Martín Arias. Su trayectoria combina formación en tecnología y audio.',
        alternative: 'Se llama Martín Arias. Tiene un perfil que cruza el trabajo en audio con la formación en tecnología.'
    },
    {
        triggers: ['que estudia', 'donde estudia', 'formacion academica', 'estudios universitarios', 'universidad', 'inteligencia artificial', 'robotica'],
        answer: 'Según su CV de 2026, Martín cursaba la Licenciatura en Inteligencia Artificial y Robótica en la Universidad Siglo 21 desde 2024. También estudió Contador en la Universidad Nacional de Luján.',
        alternative: 'En su CV de 2026 figura que estudiaba Inteligencia Artificial y Robótica en la Universidad Siglo 21 desde 2024. Antes había cursado parte de la carrera de Contador en la Universidad Nacional de Luján.'
    },
    {
        triggers: ['audio', 'sonido', 'grabacion', 'musica', 'estudio de grabacion'],
        answer: 'Martín obtuvo el título de Técnico en Grabación y Postproducción de Audio en Tecson en 2020. Su CV registra trabajo técnico en estudios de grabación y sonido.',
        alternative: 'El audio es una parte importante de su recorrido: se recibió de Técnico en Grabación y Postproducción de Audio en Tecson en 2020 y trabajó en grabación y sonido.'
    },
    {
        triggers: ['experiencia laboral', 'donde trabajo', 'en que trabajo', 'en que trabaja', 'de que trabaja', 'a que se dedica', 'de que labura', 'que hace martin', 'trabajos anteriores', 'profesion', 'ocupacion'],
        answer: 'Su CV registra experiencia en informática y audio en Nipper Estudios entre 2021 y 2026, en sonido en El Emergente entre 2018 y 2019, y en grabación en Estudios del Parral entre 2017 y 2021. También realizó tareas administrativas.',
        alternative: 'Trabajó en varios ámbitos. Según su CV, estuvo en Nipper Estudios haciendo tareas de informática y audio (2021–2026), en El Emergente con sonido (2018–2019) y en Estudios del Parral con grabación (2017–2021). También tiene experiencia administrativa.'
    },
    {
        triggers: ['que puede aportar', 'por que contratar', 'perfil profesional', 'experiencia para rrhh'],
        answer: 'Su perfil reúne experiencia en informática, audio, grabación y tareas administrativas. Además, cursaba Inteligencia Artificial y Robótica y se formó en programación y testing. El CV no informa resultados medibles ni un nivel de idiomas, así que conviene preguntarle directamente por esos detalles.',
        alternative: 'Puede aportar una mezcla de experiencia técnica y creativa: informática, audio y grabación, más formación en programación, testing e Inteligencia Artificial y Robótica. También hizo tareas administrativas. Para conocer resultados concretos o su nivel de idiomas, lo mejor es preguntarle a él.'
    },
    {
        triggers: ['programacion', 'python', 'java', 'desarrollo web', 'testing', 'software'],
        answer: 'En su formación figuran cursos de Full Stack Java, Python 3, testing y programación web. También menciona el uso de Visual Studio Code y herramientas de Office.',
        alternative: 'En tecnología, hizo cursos de Full Stack Java, Python 3, testing y desarrollo web. Su CV también menciona Visual Studio Code y herramientas de Office.'
    },
    {
        triggers: ['idiomas', 'habla ingles', 'habla italiano', 'habla aleman', 'ingles', 'italiano', 'aleman'],
        answer: 'Martín habla inglés, italiano y alemán. No se especifica un nivel de dominio.',
        alternative: 'En su CV aparecen tres idiomas: inglés, italiano y alemán. No indica qué nivel tiene en cada uno.'
    },
    {
        triggers: ['contabilidad', 'contador', 'finanzas', 'inversiones', 'mercado financiero'],
        answer: 'Martín cursó parte de la carrera de Contador en la Universidad Nacional de Luján y realizó cursos de análisis financiero y de inversiones.',
        alternative: 'También exploró el área financiera: estudió parte de Contador en la Universidad Nacional de Luján e hizo cursos de análisis financiero e inversiones.'
    },
    {
        triggers: ['github', 'codigo publico', 'perfil de github'],
        answer: 'Su perfil público de GitHub es Martin95AM.',
        alternative: 'Lo encontrás en GitHub como Martin95AM.'
    },
    {
        triggers: ['de donde es', 'en que ciudad', 'ciudad de martin', 'vive en campana'],
        answer: 'Su CV de 2026 lo vincula con Campana, en la provincia de Buenos Aires. No comparto direcciones particulares.',
        alternative: 'La ciudad que figura en su CV de 2026 es Campana, provincia de Buenos Aires. No doy direcciones privadas.'
    }
];
