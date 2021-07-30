import Markdown from './Markdown.js'


const onLoad = () => {
    const textarea = document.getElementById('editor__raw--content');
    const preview = document.getElementById('editor__preview--content');
    const panel = document.getElementById("editor__edit-panel");
    const editor = document.getElementById('editor');
    const previewToggler = document.getElementById('preview-toggler');
    const markdowner = new Markdown();

    function insertMarkup(e) {
        let index = textarea.selectionStart;
        let count = textarea.selectionEnd;
        let add = textarea.value.slice(index, count);
    
        switch (e.target.dataset.action) {
            case "heading":
                textarea.value = spliceSlice(textarea.value, index, count, add, "# ");
                break;
            case "link":
                textarea.value = spliceSlice(textarea.value, index, count, `[${add || "Title"}](https://)`);
                break;
            case "code":
                textarea.value = spliceSlice(textarea.value, index, count, add, "```", "```");
                break;
            case "bold":
                textarea.value = spliceSlice(textarea.value, index, count, add, "**", "**");
                break;
            case "list":
                textarea.value = spliceSlice(textarea.value, index, count, add, "* ");
                break;      
    
            default:
                break;        
        }
        // Update preview
        preview.innerHTML = markdowner.convert(textarea.value);
    }

    // initialize panel buttons
    Array.of(...panel.querySelectorAll("button[data-action]")).forEach(btn => {
        btn.addEventListener("click", insertMarkup);
    });
    
    if (textarea.value) {
        preview.innerHTML = markdowner.convert(textarea.value);
    };

    textarea.addEventListener('keyup', (e) => {
        preview.innerHTML = markdowner.convert(e.target.value);
    });

    previewToggler.addEventListener('click', () => {
        editor.classList.toggle('raw-hiden');
    })

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 992) {
            editor.classList.remove('raw-hiden')
        }
    })
}

document.addEventListener('DOMContentLoaded', onLoad);

function spliceSlice(str, index, count, add, start, end) {
    // We cannot pass negative indexes directly to the 2nd slicing operation.
    if (index < 0) {
    index = str.length + index;
    if (index < 0) {
        index = 0;
    }
    }

    return str.slice(0, index) + (start || "") + (add || "") + (end || "") + str.slice(index + count);
}

