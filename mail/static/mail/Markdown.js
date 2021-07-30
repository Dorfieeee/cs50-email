export default class Markdown {

    // reveil escaped characters
    // escape HTML markup sensitive characters
    getRaw = (src) => {
        return String.raw `${src}`
            .replace(/\u003C/g, '&lt')
            .replace(/\u003E/g, '&gt')
    };

    convert = (src) => {
        if (!src) {
            return src;
        }

        src = this.getRaw(src);

        const newline =  /^(\n+)/;                                  // $1 content

        const block_elements = {
            'ul':   /^\*[\u0009\u0020\u00A0]+([^\\\n]+)(?!\\\n)/,   // $1 content
            'h':    /^(#+)([^\\\n]+)(?!\\\n)/,                      // $1 prefix, $2 content
            'p':    /^([^\\\n]+)(?!\\\n)/,                          // $1 content
        };

        const inline_elements = {
            'code': /`{3}(.+?)`{3}/g,                         // $1 content
            // $1 content, $2 href='url'
            'a':    /\[([\w]+\s*[^\]]*)\]\(((?:\b(https?|ftp|file):\/\/)?[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]*)\)/g,
            'b':    /\*{2}(.+?)\*{2}/g,                             // $1 content
        };

        let block_tokens = [];
        let consecutive_counter = 0;


        while (src) {
            let match;
            // does it match newlines?
            if (newline.test(src)) {
                match = src.match(newline)
                let count = match[0].length; 
                src = src.substring(count);
                continue;
            }
            
            if ((block_elements['ul']).test(src)) {
                match = src.match(block_elements['ul'])
                block_tokens.push(`<li>${match[1]}</li>`)
                src = src.substring(match[0].length);
                // start another loop?
                continue;
            }
            
            if ((block_elements['h']).test(src)) {
                match = src.match(block_elements['h'])
                let count = match[1].length >= 6 ? 6 : match[1].length
                block_tokens.push(`<h${count}>${match[2]}</h${count}>`)
                src = src.substring(match[0].length);
                continue;
            }

            if (block_elements['p'].test(src)) {
                match = src.match(block_elements['p'])
                block_tokens.push(`<p>${match[1]}</p>`)
                src = src.substring(match[0].length);
                continue;
            }
        };

        return block_tokens
        .reduce((acc, token) => {
            token = token.trim()
            .replace(inline_elements['code'], '<code>$1</code>')
            .replace(inline_elements['a'], '<a href="$2">$1</a>')
            .replace(inline_elements['b'], '<b>$1</b>') 

            if (/^(<li>)/.test(token) && consecutive_counter === 0) {
                consecutive_counter++;
                return acc.concat('<ul>' + token);

            } else if (!/^(<li>)/.test(token) && consecutive_counter > 0) {
                consecutive_counter = 0;
                return acc.concat('</ul>' + token);
            }

            return acc.concat(token)
        }, [])
        .join('');
    };
}