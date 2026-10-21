"use strict";

// Madrid43: autenticación y control inicial de acceso.
// No se leen ni modifican datos familiares.
// El token se mantiene únicamente en la memoria de esta página.

const GOOGLE_CLIENT_ID =
  "101841005683-7kuvabg8udpdgqncqqd2chjm01tt39b6.apps.googleusercontent.com";

const CUENTAS_AUTORIZADAS = [
  "margarlop91@gmail.com",
  "miguel.moyano.1988@gmail.com"
];

let accessToken = null;
let tokenClient = null;

document.documentElement.classList.add("js-ready");

// Bloquear la interfaz hasta verificar una cuenta autorizada.
document.documentElement.classList.add("auth-required");

function prepararPanelGoogle() {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;

  const estilos = document.createElement("style");
  estilos.textContent = `
    .auth-required .welcome,
    .auth-required .section-heading,
    .auth-required .modules,
    .auth-required .footer {
      display: none !important;
    }

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

    .google-test .google-success {
      color: #216e46;
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
    <h2>Acceso a Madrid43</h2>
    <p>
      Inicia sesión con una de las dos cuentas familiares autorizadas.
    </p>
    <button type="button" id="google-login" disabled>
      Cargando acceso de Google…
    </button>
    <button type="button" id="google-clear"
      class="google-secondary" hidden>
      Cerrar sesión
    </button>
    <p id="google-message" class="google-message"
      role="status" aria-live="polite"></p>
  `;

  topbar.insertAdjacentElement("afterend", panel);

  const loginButton = document.getElementById("google-login");
  const clearButton = document.getElementById("google-clear");
  const message = document.getElementById("google-message");

  function mostrarMensaje(texto, tipo = "") {
    message.textContent = texto;
    message.classList.toggle("google-error", tipo === "error");
    message.classList.toggle("google-success", tipo === "success");
  }

  function bloquearAplicacion() {
    document.documentElement.classList.add("auth-required");
    document.documentElement.classList.remove("auth-authorized");
  }

  function permitirAplicacion() {
    document.documentElement.classList.remove("auth-required");
    document.documentElement.classList.add("auth-authorized");
  }

  function cerrarSesion(mensaje = "Sesión cerrada.") {
    accessToken = null;
    bloquearAplicacion();

    clearButton.hidden = true;
    loginButton.hidden = false;
    loginButton.disabled = !tokenClient;
    loginButton.textContent = "Iniciar sesión con Google";

    mostrarMensaje(mensaje);
  }

  clearButton.addEventListener("click", () => {
    cerrarSesion();
  });

  async function cargarIdentidad() {
    if (!accessToken) return;

    try {
      const response = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(
          "Google no ha podido verificar la cuenta. Inténtalo de nuevo."
        );
      }

      const user = await response.json();

      const correo = (user.email || "").trim().toLowerCase();

      // Solo se admite una de las dos cuentas expresamente autorizadas.
      if (
        user.email_verified !== true ||
        !CUENTAS_AUTORIZADAS.includes(correo)
      ) {
        accessToken = null;
        bloquearAplicacion();

        loginButton.hidden = false;
        loginButton.disabled = false;
        loginButton.textContent = "Intentar con otra cuenta";
        clearButton.hidden = true;

        mostrarMensaje(
          "Acceso denegado. Esta cuenta no está autorizada para utilizar Madrid43.",
          "error"
        );
        return;
      }

      // La identidad está verificada y el correo está en la lista permitida.
      permitirAplicacion();

      loginButton.hidden = true;
      clearButton.hidden = false;

      mostrarMensaje(
        `Acceso correcto. Cuenta: ${correo}`,
        "success"
      );
    } catch (error) {
      accessToken = null;
      bloquearAplicacion();

      loginButton.hidden = false;
      loginButton.disabled = false;
      loginButton.textContent = "Volver a intentarlo";
      clearButton.hidden = true;

      mostrarMensaje(
        error.message || "No se ha podido verificar la cuenta.",
        "error"
      );
    }
  }

  function inicializarGoogle() {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",

      callback: async (respuesta) => {
        loginButton.disabled = false;
        loginButton.textContent = "Iniciar sesión con Google";

        if (respuesta.error || !respuesta.access_token) {
          accessToken = null;
          bloquearAplicacion();

          mostrarMensaje(
            "Google no ha autorizado el acceso. " +
            (respuesta.error_description || respuesta.error || ""),
            "error"
          );
          return;
        }

        accessToken = respuesta.access_token;
        mostrarMensaje("Verificando la cuenta…");

        await cargarIdentidad();
      },

      error_callback: (error) => {
        accessToken = null;
        bloquearAplicacion();

        loginButton.disabled = false;
        loginButton.textContent = "Volver a intentarlo";

        mostrarMensaje(
          "No se ha podido abrir la ventana de Google. " +
          (error.message || "Comprueba si el navegador la ha bloqueado."),
          "error"
        );
      }
    });

    loginButton.disabled = false;
    loginButton.textContent = "Iniciar sesión con Google";
  }

  loginButton.addEventListener("click", () => {
    if (!tokenClient) {
      mostrarMensaje(
        "El acceso de Google aún no está disponible.",
        "error"
      );
      return;
    }

    loginButton.disabled = true;
    mostrarMensaje("Esperando la autorización de Google…");

    try {
      tokenClient.requestAccessToken({
        prompt: "select_account"
      });
    } catch (error) {
      loginButton.disabled = false;
      loginButton.textContent = "Volver a intentarlo";

      mostrarMensaje(
        "No se ha podido iniciar el acceso con Google.",
        "error"
      );
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
      "error"
    );
  };

  document.head.appendChild(script);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", prepararPanelGoogle);
} else {
  prepararPanelGoogle();
}
