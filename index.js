const puppeteer = require("puppeteer"),
settings = require("./settings.json"),
readline = require("readline"),
program = require("commander");

program
    .version("0.1.0")
    .option('-f, --fullscreen', 'Start in fullscreen')
    .parse(process.argv)

config = {
    headless: false,
    args: [`--window-size=${settings.width},${settings.height}`]
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
        p.goto(url);
        p.setViewport(settings);
    });
    
    //Close initial page
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
    
    commands.start = (args) => new Promise ((resolve, reject) => {
        console.log("Starting rotation");

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
        }, settings.interval)
    
        resolve();
    });

    commands.pause = (args) => new Promise((resolve, reject) => {
        console.log("Pausing rotation");
        clearInterval(interval);

        resolve();
    });

    commands.exit = (args) => new Promise((resolve, reject) => {
        process.exit();
    }); 

    commands.view = (args) => new Promise((resolve, reject) => {

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
    });

    commands.pages = (args) => new Promise(async (resolve, reject) => {
        const pages = await browser.pages();
        for (let i = 0; i < pages.length; i++) {
            const p = pages[i];
            const url = p.url();

            console.log(`Tab[${i+1}] ${url}`)
        }
        resolve();
    });

    const url_regex = /(((http)|(https)):\/\/)?(\w+:)?([a-z0-9@]+\.)+[a-z0-9]+(:\d+)?((\/[\w()?=&#-%-\S]+)+)?/g;
    commands.add = (args) => new Promise(async (resolve, reject) => {
        if (!args.length)
            resolve(console.log("\nPlease use the syntax\nadd %url%\n"));
        
        else if (!(url_regex).test(args[0]))
            resolve(console.log("Please only use full urls"))

        else browser.newPage().then(p => {
            p.goto(args[0]);
            p.setViewport(view);
            resolve();
        });
    });

    commands.close = (args) => new Promise(async (resolve, reject) => {
        if (!args.length || isNaN(args[0]))
            resolve(console.log("\nPlease use the syntax\n>close %tab_index%\n"));
        
            else browser.pages().then(pages => {
                const index = args[0]-1;

                if (!pages[index])
                    return resolve(console.log("Invalid tab index!\n"));
                
                console.log(`Closing page ${args[0]}:${pages[index].url()}`)
                pages[index].close();
                resolve();
        });
    });

    commands.help = (args) => new Promise(async (resolve, reject) => {
        console.log("\nCommands:")
        for (name in commands) {
            console.log(name)
        }
        console.log("\n")
        resolve();
    })

    function inpuHandler(line) {
        let args = line.split(/\s/g);
        args = args.map(x => x.trim());
        let cmd = args.splice(0,1)[0];


        if (commands[cmd]) {
            commands[cmd](args).then(() => rl.prompt(">"))
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
