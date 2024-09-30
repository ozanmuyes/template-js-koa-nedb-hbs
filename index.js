import fs from "node:fs";
import path from "node:path";
import https from "node:https";

import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import session from "koa-session";
import serve from "koa-static";
import Datastore from "nedb";
import handlebars from "koa-handlebars";
import { z } from "zod";
import bcrypt from "bcrypt";

const HTTP_PORT = 4430;
const HTTP_HOST = "127.0.0.1";
const IS_DEV = true;
const STATIC_FILES_MAXAGE = 0; // on prod 31536000

// #region Repos

const repoUsers = new Datastore({
  filename: path.join(import.meta.dirname, ".data", "users"),
  autoload: true,
});

// #endregion Repos

// #region Middlewares

function requireAuthentication(redirUrl) {
  return async function _requireAuthentication(ctx, next) {
    if (!ctx.session.user) {
      ctx.redirect(`/login?redir=${redirUrl ?? ctx.routerPath}`);
    } else {
      await next();
    }
  };
}

function requireNoAuthentication(redirUrl) {
  return async function _requireNoAuthentication(ctx, next) {
    if (ctx.session.user) {
      ctx.redirect("/");
    } else {
      await next();
    }
  };
}

// #endregion Middlewares

const router = new Router();

// #region Routes

router.get("/dev-live-reload.js", async (ctx, next) => {
  const body = IS_DEV
    ? /* js */ `
        let mustReload = false;
        function connectLiveReloadServer() {
          const ws = new WebSocket('ws://falafel.localhost:4431');
          ws.onerror = (err) => { console.log(err); };
          ws.onclose = () => {
            mustReload = true;
            setTimeout(function() {
              connectLiveReloadServer();
            }, 1000);
          };
          ws.onopen = () => {
            if (mustReload) {
              mustReload = false;
              window.location.reload();
            }
          };
        }
        connectLiveReloadServer();
      `
    : "";

  ctx.set("content-type", "text/html");
  ctx.set("cache-control", "max-age=31536");
  ctx.body = body;

  await next();
});

router.get("/", async (ctx, next) => {
  await ctx.render("index", {
    title: "Index Page",
  });

  await next();
});

router.get("/public", async (ctx, next) => {
  await ctx.render("public", {
    title: "Public Page",
  });

  await next();
});

router.get("/login", async (ctx, next) => {
  if (ctx.session.user) {
    ctx.redirect("back", "/");

    await next();
    return;
  }

  await ctx.render("login", {
    title: "Login",
  });

  await next();
});

const schemaPostLogin = z.object({
  username: z.string().min(3),
  password: z.string().min(3),
});
router.post(
  "/login",
  requireNoAuthentication("back"),
  bodyParser(),
  async (ctx, next) => {
    const { username, password } = schemaPostLogin.parse(ctx.request.body);

    const { _id: __id, ...user } = await new Promise((resolve, reject) => {
      repoUsers.findOne({ username }, (err, doc) => {
        if (err) {
          reject(err);
        } else {
          resolve(doc);
        }
      });
    });
    if (!user) {
      ctx.throw(403);
    }
    const passwordsMatches = await bcrypt.compare(password, user.password);
    if (!passwordsMatches) {
      ctx.throw(403);
    }

    const { password: _password, ...userWOPassword } = user;

    ctx.session = {
      ...ctx.session,
      user: userWOPassword,
    };

    if (ctx.request.query.redir) {
      ctx.redirect(ctx.request.query.redir, "/");
    } else {
      ctx.redirect("/");
    }

    await next();
  },
);

router.get("/private", requireAuthentication(), async (ctx, next) => {
  await ctx.render("private", {
    title: "Private Page",
    username: ctx.session.user.username,
  });

  await next();
});

router.post("/logout", requireAuthentication("/login"), async (ctx, next) => {
  if (ctx.session.user) {
    ctx.session.user = undefined;
  }

  ctx.redirect("/");

  await next();
});

// #endregion Routes

(async () => {
  // ---------------------------------------------------------------------------
  // debugger; // To check to see if we intend to run this snippet
  // const res = await new Promise((resolve, reject) => {
  //   repoUsers.insert(
  //     {
  //       username: "john.doe",
  //       email: "john@does.co",
  //       password:
  //         "$2a$12$iG7C6SkAFXEsquYIqspyX.sxTtWeCWJ.Zcnbmev3WN26syx5XKzqG", // john.doe
  //     },
  //     (err, doc) => {
  //       if (err) {
  //         reject(err);
  //       } else {
  //         resolve(doc);
  //       }
  //     },
  //   );
  // });
  // ---------------------------------------------------------------------------

  const app = new Koa();

  app.keys = ["A+P;%lRK[GM+}0E[%:>:"];

  // #region Register Middlewares

  app.use(
    handlebars({
      defaultLayout: "main",
    }),
  );

  app.use(router.routes());
  app.use(router.allowedMethods());

  /**
   * See;
   * - https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
   * - https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security
   */
  app.use(
    session(
      {
        key: "__Host-falafel.sess",
        httpOnly: true,
        signed: true,
        secure: true,
        sameSite: "strict",
      },
      app,
    ),
  );

  //

  // #endregion Register Middlewares

  const server = https.createServer(
    {
      key: fs.readFileSync("./cert/YOUR_PROJECT_NAME.localhost.key"),
      cert: fs.readFileSync("./cert/YOUR_PROJECT_NAME.localhost.crt"),
    },
    app.callback(),
  );

  // NOTE Also see "/dev-live-reload.js" route
  if (IS_DEV) {
    try {
      const { WebSocketServer } = await import("ws");
      new WebSocketServer({ port: 4431 });
    } catch (err) {
      console.log(err);
    }
  }

  server.listen(HTTP_PORT, HTTP_HOST, () => {
    console.log(`Visit https://${HTTP_HOST}:${HTTP_PORT}`);
  });
})();
