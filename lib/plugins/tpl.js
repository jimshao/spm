// 读取模板文件，内嵌到项目文件中。减少请求。
// 用户可以通过命令和package.json覆盖默认行为.

var path = require('path');
var fsExt = require('../utils/fs_ext.js');
var Plugin = require('../core/plugin.js');
var Ast = require('../utils/ast.js');
var isTpl = require('../utils/module_help.js').isTpl;

var plugin = module.exports = Plugin.create('tpl');

plugin.param('tpl', true, 'inline template file.');

plugin.run = function(project, callback) {
  if (!this.tpl) {
    callback();
    return;
  }

  var build = project.buildDirectory;
  var moduleCache = project.moduleCache;
  var code, files;

  var spacePattern = /^[\s\t]*|[\s\t]$/gm;
  files = fsExt.list(build, /\.js$/).forEach(function(file) {
    var filepath = path.join(build, file);

    var allDeps = moduleCache.getAllDeps(file) || [];
    code = moduleCache.getAst(file);
    var hasTpl = allDeps.some(function(dep) {
      return isTpl(dep); 
    });

    if (hasTpl) {
      code = Ast.replaceRequire(code, isTpl, function(depModName) {
        var tplFilepath = project.getDepModulePath(filepath, depModName);
        var tplCode = fsExt.readFileSync(tplFilepath);

        tplCode = tplCode.replace(/'/g, function(m, pos, str) {
          if (pos > 0 && str.charAt(pos - 1) === '\\') {
            // 被转义，不进行引号替换.
            return m;
          }

          // uglifyjs 会自动把 单引号给转义?
          // return '\\\'';
          return '\'';
        });
        tplCode = tplCode.replace(spacePattern, '');

        return tplCode; 
      });
      fsExt.writeFileSync(filepath, code);
    }
  });

  callback();
};
