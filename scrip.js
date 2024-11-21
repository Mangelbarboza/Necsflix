
document.addEventListener("DOMContentLoaded", () => {
    // Botón de inicio de sesión
   // Botón de inicio de sesión
const loginButton = document.querySelector(".btn-login");
loginButton.addEventListener("click", () => {
    window.location.href = "auth.html"; // Redirige a la página de autenticación
});


    // Botón "Ver Ahora" en el banner
    const watchNowButton = document.querySelector(".btn-primary");
    watchNowButton.addEventListener("click", () => {
        // Redirige a la página de reproducción con un video predeterminado
        const videoUrl = 'path/to/default/video.mp4'; // Cambia al enlace de tu video predeterminado
        window.location.href = `player.html?video=${encodeURIComponent(videoUrl)}`;
    });
   
});
function executeSQL() {
    const query = document.getElementById('sql-query').value;
    if (!query.trim()) {
        alert('Escribe una consulta SQL.');
        return;
    }

    fetch('/execute-sql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    })
    .then(response => response.json())
    .then(data => {
        const resultDiv = document.getElementById('sql-result');
        if (data.error) {
            resultDiv.textContent = `Error: ${data.error}`;
        } else {
            resultDiv.textContent = JSON.stringify(data.result, null, 2);
        }
    })
    .catch(error => {
        console.error('Error ejecutando la consulta:', error);
        document.getElementById('sql-result').textContent = 'Error ejecutando la consulta';
    });
}
