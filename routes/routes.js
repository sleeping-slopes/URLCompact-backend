module.exports = (app) =>
{
    app.route('/api/shortcuts').get(getShortcutByQuery);
    app.route('/api/shortcuts').post(postNew);
    app.route('/api/shortcuts/:id/click').patch(click);
}

const response = require('./../response')
const queryPromise = require('./../settings/database')

const convertToBase62 = (base10) =>
{
    let shortURL="";
    const symbols="0123456789ABCDEFGHIKLMNOPQRSTUVWZYXabcdefghijklmnopqrstuvwxyz";
    const l = symbols.length;
    while(base10>=0)
    {
        const symbolIndex=base10%l;
        shortURL=symbols.charAt(symbolIndex)+shortURL;
        base10=Math.floor(base10/l);
        if (base10==0) break;
        else base10--;
    }
    return shortURL;
}

const convertToBase10 = (base62) =>
{
    const symbols="0123456789ABCDEFGHIKLMNOPQRSTUVWZYXabcdefghijklmnopqrstuvwxyz";
    let id = -1;
    for (let i =0;i<base62.length;i++)
    {
        const pos = symbols.indexOf(base62[i]);
        if (pos<0) return -1;
        id += (symbols.indexOf(base62[i])+1) * Math.pow(symbols.length,base62.length-i-1);
    }
    return id;
}

const getShortcutByQuery = async (req,res) =>
{
    try
    {
        if (req.query.id)
        {
            const id = convertToBase10(req.query.id);
            const shortcuts = await queryPromise("SELECT `id`,`url`,`clicks` FROM `shortcuts` WHERE `id` = ?", [id]);
            if (shortcuts.length<1)
            {
                const error = {error:'Shortcut not found.'};
                return response.status(200,error,res);
            }
            const shortcut = shortcuts[0];
            shortcut.id=req.query.id;
            return response.status(200,shortcut,res);
        }
        else if (req.query.url)
        {
            const url = req.query.url;
            const shortcuts = await queryPromise("SELECT `id`,`url`,`clicks` FROM `shortcuts` WHERE `url` = ?", [url]);
            if (shortcuts.length<1)
            {
                const error = {error:'Shortcut not found.'};
                return response.status(200,error,res);
            }
            const shortcut = shortcuts[0];
            shortcut.id=convertToBase62(shortcut.id);
            return response.status(200,shortcut,res);
        }
        else return response.status(400,{error:"empty query string"},res);
    }
    catch(error) { return response.status(400,error,res); }
}

const postNew = async (req,res) =>
{
    try
    {
        const insertShortcut = await queryPromise("INSERT INTO `shortcuts` (`url`) VALUES (?)", [req.body.url]);
        const shortcut = {id: convertToBase62(insertShortcut.insertId)};
        return response.status(201,shortcut,res);
    }
    catch(error) { return response.status(400,error,res); }
}

const click = async (req,res) =>
{
    try
    {
        const id = convertToBase10(req.params.id);
        const clickShortcut = await queryPromise("UPDATE `shortcuts` SET `clicks` = (`clicks`+1) WHERE (`id` = ?)",[id]);
        return response.status(201,"OK",res);
    }
    catch(error) { return response.status(400,error,res); }
}