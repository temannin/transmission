const Koa = require("koa");
const Router = require("@koa/router");
const fs = require("fs");
const marked = require("marked");
let ejs = require("ejs");
const minify = require("minify");
const logger = require("koa-logger");

var app = new Koa();
var router = new Router();

marked.setOptions({
  renderer: new marked.Renderer(),
  highlight: function (code, language) {
    const hljs = require("highlight.js");
    const validLanguage = hljs.getLanguage(language) ? language : "plaintext";
    return hljs.highlight(validLanguage, code).value;
  },
  pedantic: false,
  gfm: true,
  breaks: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
  xhtml: false,
});

const mapping = {
  "/": "index.html",
  "/index.html": "index.html",
  "/style.css": "style.css",
};

const mimeTypes = {
  html: "text/html",
  css: "text/css",
};

const site = {
  title: "Tyler's Programming Blog",
  tagline: "General programming tomfoolery",
  posts: getPosts(),
};

// response
app
  .use(logger())
  .use(router.routes())
  .use(async (ctx, next) => {
    if (!isEmpty(ctx.request.url) && ctx.request.url in mapping) {
      const extension = fileExtension(ctx.request.url);
      ctx.response.type = mimeTypes[extension]
        ? mimeTypes[extension]
        : mimeTypes["html"];

      if (ctx.response.type === "text/html") {
        let filePath = `./content/${mapping[ctx.request.url]}`;
        await minify(filePath).then((data) => {
          ctx.response.body = ejs.render(data, { site: site });
        });
      } else {
        let filePath = `./content/${mapping[ctx.request.url]}`;
        await minify(filePath).then((data) => {
          ctx.response.body = data;
        });
      }
    }
  });

function getPosts() {
  let posts = [];
  let files = fs.readdirSync("./content/posts/");
  files.forEach((file) => {
    let props = marked
      .lexer(fs.readFileSync(`./content/posts/${file}`, "utf8"))[1]
      .raw.split("\n");
    let post = {};
    props.forEach((element) => {
      var key = Object.keys(JSON.parse("{" + element + "}"))[0];
      var value = JSON.parse("{" + element + "}")[key];
      post[key] = value;
    });
    posts.push(post);
  });
  return posts;
}

function fileExtension(filename, opts) {
  if (!opts) opts = {};
  if (!filename) return "";
  var ext = (/[^./\\]*$/.exec(filename) || [""])[0];
  return opts.preserveCase ? ext : ext.toLowerCase();
}

function isEmpty(value) {
  return (
    value == null ||
    value.length === 0 ||
    value.replace(/^\s+|\s+$/g, "").length == 0
  );
}

app.listen(3000);
