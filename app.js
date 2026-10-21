
"use strict";

// Madrid43: primera prueba de autenticación con Google.
// No se leen ni modifican datos familiares.
// El token se mantiene únicamente en la memoria de esta página.

const GOOGLE_CLIENT_ID =
  "101841005683-7kuvabg8udpdgqncqqd2chjm01tt39b6.apps.googleusercontent.com";

let accessToken = null;
let tokenClient = null;

document.documentElement.classList.add("js-ready");

function prepararPanelGoogle() {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;

  const estilos = document.createElement("style");
  estilos.textContent = `
    .google-test {
      margin: 0 0 24px;
      padding: 20px;
      border: 1px solid #dfe5ec;
      border-radius: 18px;
      background: #fff;
    }
    .google-test h2 {
      margin: 0 0 8px;
      font: 700 18px Manrope, sans-serif;
    }
    .google-test p {
      margin: 0 0 14px;
      color: #687281;
      font-size: 13px;
      line-height: 1.6;
    }
    .google-test button {
      min-height: 42px;
      padding: 10px 16px;
      border: 0;
      border-radius: 10px;
      background: #283a50;
      color: #fff;
      font: 600 13px "DM Sans", sans-serif;
      cursor: pointer;
    }
    .google-test button:disabled {
      opacity: .55;
      cursor: wait;
    }
    .google-test .google-secondary {
      margin-left: 8px;
      background: #e9edf2;
      color: #283a50;
    }
    .google-test .google-message {
      margin-top: 12px;
      margin-bottom: 0;
      overflow-wrap: anywhere;
    }
    .google-test .google-error {
      color: #a33333;
    }
    @media (max-width: 480px) {
      .google-test .google-secondary {
        margin: 8px 0 0;
      }
    }
  `;
  document.head.appendChild(estilos);

  const panel = document.createElement("section");
  panel.className = "google-test";
  panel.innerHTML = `
    <h2>Prueba de acceso con Google</h2>
    <p>
      Inicia sesión con una de las cuentas autorizadas.
      Esta prueba solo verifica la identidad; todavía no accede
      al calendario, Drive ni las hojas de cálculo.
    </p>
    <button type="button" id="google-login" disabled>
      Cargando acceso de Google…
    </button>
    <button type="button" id="google-clear" class="google-secondary"
      hidden>
      Borrar sesión de esta página
    </button>
    <p id="google-message" class="google-message" role="status"
      aria-live="polite"></p>
  `;

  topbar.insertAdjacentElement("afterend", panel);

  const loginButton = document.getElementById("google-login");
  const clearButton = document.getElementById("google-clear");
  const message = document.getElementById("google-message");

  function mostrarMensaje(texto, error = false) {
    message.textContent = texto;
    message.classList.toggle("google-error", error);
  }

  function borrarSesion() {
    // No se guarda el token en almacenamiento del navegador.
    accessToken = null;
    clearButton.hidden = true;
    loginButton.hidden = false;
    loginButton.disabled = false;
    loginButton.textContent = "Iniciar sesión con Google";
    mostrarMensaje("Sesión borrada de esta página.");
  }

  clearButton.addEventListener("click", borrarSesion);

  function cargarIdentidad() {
    if (!accessToken) return;

    fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Google no ha podido verificar la cuenta.");
        }
        return response.json();
      })
      .then((user) => {
        const identidad = user.email || "Cuenta verificada";
        loginButton.hidden = true;
        clearButton.hidden = false;
        mostrarMensaje(`Acceso correcto. Cuenta: ${identidad}`);
      })
      .catch((error) => {
        accessToken = null;
        loginButton.hidden = false;
        loginButton.disabled = false;
        loginButton.textContent = "Volver a intentarlo";
        mostrarMensaje(error.message, true);
      });
  }

  function inicializarGoogle() {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: (respuesta) => {
        loginButton.disabled = false;
        loginButton.textContent = "Iniciar sesión con Google";

        if (respuesta.error) {
          mostrarMensaje(
            "Google no ha autorizado el acceso. " +
            (respuesta.error_description || respuesta.error),
            true
          );
          return;
        }

        accessToken = respuesta.access_token;
        mostrarMensaje("Acceso autorizado. Comprobando la cuenta…");
        cargarIdentidad();
      },
      error_callback: (error) => {
        loginButton.disabled = false;
        loginButton.textContent = "Volver a intentarlo";
        mostrarMensaje(
          "No se ha podido abrir la ventana de Google. " +
          (error.message || "Comprueba si el navegador la ha bloqueado."),
          true
        );
      }
    });

    loginButton.disabled = false;
    loginButton.textContent = "Iniciar sesión con Google";
  }

  loginButton.addEventListener("click", () => {
    if (!tokenClient) {
      mostrarMensaje("El acceso de Google aún no está disponible.", true);
      return;
    }

    loginButton.disabled = true;
    mostrarMensaje("Esperando la autorización de Google…");

    try {
      tokenClient.requestAccessToken({ prompt: "select_account" });
    } catch (error) {
      loginButton.disabled = false;
      mostrarMensaje("No se ha podido iniciar el acceso con Google.", true);
    }
  });

  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.onload = inicializarGoogle;
  script.onerror = () => {
    loginButton.disabled = true;
    loginButton.textContent = "Acceso de Google no disponible";
    mostrarMensaje(
      "No se ha podido cargar el servicio de Google. " +
      "Comprueba la conexión a Internet.",
      true
    );
  };
  document.head.appendChild(script);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", prepararPanelGoogle);
} else {
  prepararPanelGoogle();
}
