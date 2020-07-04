const Koa = require("koa");
const Router = require("@koa/router");
const fs = require("fs");
const marked = require("marked");
let ejs = require("ejs");
const minify = require("minify");
const logger = require("koa-logger");
var mime = require("mime-types");

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

const site = {
  title: "Tyler's Programming Blog",
  tagline: "General programming tomfoolery",
  posts: getPosts(),
};

router.get("/posts/:uri", (ctx, next) => {
  let uri = encodeURI(ctx.params.uri);
  site.posts.forEach((element) => {
    if (element.uri === uri) {
      let body = fs
        .readFileSync(element.path, "utf-8")
        .substring(3)
        .split("---")[1];
      let wrapper = fs.readFileSync("./content/views/posts.html", "utf-8");
      ctx.response.body = minify.html(
        ejs.render(wrapper, {
          site: element,
          post: minify.html(marked(body)),
        })
      );
    }
  });
});

// response
app
  .use(logger())
  .use(router.routes())
  .use(async (ctx, next) => {
    let contentRequest =
      ctx.request.url === "/" ? "/index.html" : ctx.request.url;

    const type = mime.lookup(fileExtension(contentRequest));
    ctx.response.type = type ? type : "text/html";

    let filePath = `./content${contentRequest}`;
    await minify(filePath)
      .then((data) => {
        let body = data;
        if (type === "text/html") {
          body = ejs.render(data, { site: site });
        }
        ctx.response.body = body;
      })
      .catch((err) => {
        ctx.response.status = 404;
      });
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
    post["uri"] = encodeURI(post["title"]);
    post["path"] = `./content/posts/${file}`;
    post["time"] = fs.statSync(post["path"]).mtime;
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
