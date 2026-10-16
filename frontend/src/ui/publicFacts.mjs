// Resumen profesional del CV compartido por Martín, redactado para visitantes.
// No incluir segundo nombre/apellido, documentos, CUIT, domicilio, teléfono ni correo.
export const PUBLIC_FACTS = [
    {
        triggers: ['quien es martin', 'quien es martin arias', 'nombre de martin', 'como se llama martin', 'cual es su nombre', 'su nombre'],
        answer: 'Su nombre público es Martín Arias. Su trayectoria combina formación en tecnología y audio.'
    },
    {
        triggers: ['que estudia', 'donde estudia', 'formacion academica', 'estudios universitarios', 'universidad', 'inteligencia artificial', 'robotica'],
        answer: 'Según su CV de 2026, Martín cursaba la Licenciatura en Inteligencia Artificial y Robótica en la Universidad Siglo 21 desde 2024. También estudió Contador en la Universidad Nacional de Luján.'
    },
    {
        triggers: ['audio', 'sonido', 'grabacion', 'musica', 'estudio de grabacion'],
        answer: 'Martín obtuvo el título de Técnico en Grabación y Postproducción de Audio en Tecson en 2020. Su CV registra trabajo técnico en estudios de grabación y sonido.'
    },
    {
        triggers: ['experiencia laboral', 'donde trabajo', 'en que trabajo', 'en que trabaja', 'trabajos anteriores', 'profesion', 'ocupacion'],
        answer: 'Su CV registra experiencia en informática y audio en Nipper Estudios entre 2021 y 2026, en sonido en El Emergente entre 2018 y 2019, y en grabación en Estudios del Parral entre 2017 y 2021. También realizó tareas administrativas.'
    },
    {
        triggers: ['programacion', 'python', 'java', 'desarrollo web', 'testing', 'software'],
        answer: 'En su formación figuran cursos de Full Stack Java, Python 3, testing y programación web. También menciona el uso de Visual Studio Code y herramientas de Office.'
    },
    {
        triggers: ['idiomas', 'habla ingles', 'habla italiano', 'habla aleman', 'ingles', 'italiano', 'aleman'],
        answer: 'Martín habla inglés, italiano y alemán. No se especifica un nivel de dominio.'
    },
    {
        triggers: ['contabilidad', 'contador', 'finanzas', 'inversiones', 'mercado financiero'],
        answer: 'Martín cursó parte de la carrera de Contador en la Universidad Nacional de Luján y realizó cursos de análisis financiero y de inversiones.'
    },
    {
        triggers: ['github', 'codigo publico', 'perfil de github'],
        answer: 'Su perfil público de GitHub es Martin95AM.'
    },
    {
        triggers: ['de donde es', 'en que ciudad', 'ciudad de martin', 'vive en campana'],
        answer: 'Su CV de 2026 lo vincula con Campana, en la provincia de Buenos Aires. No comparto direcciones particulares.'
    }
];
