const puppeteer = require("puppeteer"),
settings = require("./settings.json"),
readline = require("readline"),
columnify = require("columnify"),
program = require("commander");

program
    .version("0.1.0")
    .option('-f, --fullscreen', 'Start in fullscreen')
    .parse(process.argv)

config = {
    headless: false,
    args: [`--window-size=${settings.width},${settings.height}`, "--disable-infobars"]
};

if (program.fullscreen)
    config.args.push("--start-fullscreen")

if (settings.executablePath)
    config.executablePath = settings.executablePath;

puppeteer.launch(config).then(async browser => {
    browser.on("disconnected", error);
    const {sites} = settings;

    //Open pages
    await sites.forEach(async url => {
        const p = await browser.newPage();
        p.waitForNavigation( {timeout: 0});
        p.goto(url);
        p.setViewport(settings);
    });
    
    //Close initial page
    if (sites.length)
        (await browser.pages())[0].close()
    
    //Create prompt
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    rl.prompt('>');
    rl.on('line', inpuHandler)
    
    let interval;
    let view = {width: settings.width, height: settings.height};

    let commands = {};
    
    commands.rotate = {
        fn: (args) => new Promise ((resolve, reject) => {

            if (!args.length || isNaN(args[0]))
                resolve(console.log("\nPlease use the syntax\n>front %tab_index%\n"));

            console.log(`Starting rotation with interval: ${args[0]}ms`);

            let index = 0;
            clearInterval(interval);
            interval = setInterval(() => {
                browser.pages().then(pages => {
                    pages[index].bringToFront()
            
                    index++;
                    if (index >= pages.length)
                        index = 0;
            
                    pages[index].reload()
                });
            }, args[0])
        
            resolve();
        }),
        description: "Rotate tabs at set interval"
    }


    commands.pause = {
        fn: (args) => new Promise((resolve, reject) => {
            console.log("Pausing rotation");
            clearInterval(interval);

            resolve();
        }),
        description: "Pause rotation"
    }

    commands.exit = {
        fn: (args) => new Promise((resolve, reject) => {
            process.exit();
        }),
        description: "End process"
    } 

    commands.view = {
        fn: (args) => new Promise((resolve, reject) => {
            if (args.length < 2) {
                browser.pages().then(pages => {
                    console.log("resetting viewport");
                    view = {width: settings.width, height: settings.height};
                    pages.forEach(p => p.setViewport(view));
                    resolve();
                });
            } else {
                for (let i = 0; i < args.length; i++) {
                    if(isNaN(args[i]))
                        return resolve(console.log("\nPlease use the syntax\nview %width% %height%\n"))
                }
        
                browser.pages().then(pages => {
                    view = {width:parseInt(args[0]), height:parseInt(args[1])};
                    pages.forEach(p => p.setViewport(view));
                    resolve();
                });
            }
        }),
        description: "Change viewport on all pages"
    }

    commands.pages = {
        fn: (args) => new Promise(async (resolve, reject) => {
            const pages = await browser.pages();
            for (let i = 0; i < pages.length; i++) {
                const p = pages[i];
                const url = p.url();

                const active = await p.evaluate("document.visibilityState") === "visible";
                
                console.log((active?"=> ":"   ") + `Tab[${i+1}] ${url}`);
            }
            resolve();
        }),
        description: "Show all tabs"
    }

    const url_regex = /((https?|ftp):\/\/)?(([^:\n\r]+):([^@\n\r]+)@)?((www\.)?([^/\n\r]+))\/?([^?\n\r]+)?\??([^#\n\r]*)?#?([^\n\r]*)/g;
    commands.add = {
        fn: (args) => new Promise(async (resolve, reject) => {
            if (!args.length)
                return resolve(console.log("\nPlease use the syntax\nadd %url%\n"));
            
            if (!(url_regex).test(args[0]))
                return resolve(console.log("Please only use full urls"))

            browser.newPage().then(p => {
                p.waitForNavigation( {timeout: 0});
                p.goto(args[0]);
                p.setViewport(view);
                resolve();
            });
        }),
        description: "Add a page"
    }

    commands.close = {
        fn: (args) => new Promise(async (resolve, reject) => {
            if (!args.length || isNaN(args[0]))
                resolve(console.log("\nPlease use the syntax\n>close %tab_index%\n"));
            
                else browser.pages().then(pages => {
                    const index = args[0]-1;

                    if (!pages[index])
                        return resolve(console.log("Invalid tab index!\n"));
                    
                    console.log(`Closing page ${args[0]}:${pages[index].url()}`)
                    pages[index].close();
                    resolve();
            })
        }),
        description: "Close a page"
    }
    
    commands.front = {
        fn: (args) => new Promise(async (resolve, reject) => {
            if (!args.length || isNaN(args[0]))
                resolve(console.log("\nPlease use the syntax\n>front %tab_index%\n"));
            
                else browser.pages().then(pages => {
                    const index = args[0]-1;

                    if (!pages[index])
                        return resolve(console.log("Invalid tab index!\n"));
                    
                    console.log(`Bringing page ${args[0]}:${pages[index].url()} to front`)
                    pages[index].bringToFront();
                    resolve();
            });
        }),
        description: "Make a tab active"
    }

    commands.help = {
        fn: (args) => new Promise(async (resolve, reject) => {
            let list = {};
            for (name in commands) {
                list[name] = commands[name].description
            }
            console.log("\n"+columnify(list,{columns: ['COMMAND', 'DESCRIPTION']})+"\n")
            resolve();
        }),
        description: "Show this list"
    }

    function inpuHandler(line) {
        let args = line.split(/\s/g);
        args = args.map(x => x.trim());
        let cmd = args.splice(0,1)[0];


        if (commands[cmd]) {
            commands[cmd].fn(args).then(() => rl.prompt(">"))
        } else {
            console.log("Command not found");
            rl.prompt(">");
        }
    }
    
})

function error(e) {
    console.log("\nAn error occured!!");
    process.exit(1);
}
