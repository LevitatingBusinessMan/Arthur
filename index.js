const puppeteer = require("puppeteer");
const settings = require("./settings.json");
const readline = require("readline")

puppeteer.launch({
    headless: false,
    args: [`--window-size=${settings.width},${settings.height}`]
}).then(async browser => {
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
        console.log("Starting rotation");

        let index = 0;
        interval = setInterval(() => {
            browser.pages().then(pages => {
                pages[index].bringToFront()
                .catch(error)
        
                index++;
                if (index >= pages.length)
                    index = 0;
        
                pages[index].reload()
                .catch(error)
            });
        }, settings.interval)
    
        resolve();
    });

    commands.pause = (args) => new Promise((resolve, reject) => {
        console.log("Pausing rotation");
        clearInterval(interval);

        resolve();
    })

    commands.exit = (args) => new Promise((resolve, reject) => {
        process.exit();
    })    
    function inpuHandler(line) {
        let args = line.split(/\s/g);
        let cmd = args.splice(0,1)[0]

        if (commands[cmd]) {
            commands[cmd]().then(() => rl.prompt(">"))
        } else {
            console.log("Command not found");
            rl.prompt(">")
        }
    }
    
})

function error(e) {
    console.log("\n An error occured!!");
    process.exit(1);
}
