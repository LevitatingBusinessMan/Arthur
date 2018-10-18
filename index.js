const puppeteer = require("puppeteer"),
settings = require("./settings.json"),
readline = require("readline"),
program = require("commander");

program
    .version("0.1.0")
    .option('-f, --fullscreen', 'Start in fullscreen')
    .parse(process.argv)

console.log(program.fullscreen)

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

    let commands = {};
    
    commands.start = (args) => new Promise ((resolve, reject) => {
        console.log("Starting rotation\n");

        let index = 0;
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
        console.log("Pausing rotation\n");
        clearInterval(interval);

        resolve();
    });

    commands.exit = (args) => new Promise((resolve, reject) => {
        process.exit();
    }); 

    commands.view = (args) => new Promise((resolve, reject) => {

        if (args.length < 2)
            return resolve(console.log("\nPlease use the syntax\n>view %width% %height%\n"));
        
        for (let i = 0; i < args.length; i++) {
            if(isNaN(args[i]))
                return resolve(console.log("\nPlease use the syntax\n>view %width% %height%\n"))
        }

        browser.pages().then(pages => {
            pages.forEach(p => p.setViewport({width:parseInt(args[0]), height:parseInt(args[1])}));
            resolve();
        });
    });

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
