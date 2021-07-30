import Markdown from './Markdown.js'

document.addEventListener('DOMContentLoaded', function() {

  console.clear();


  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archive').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () => compose_email());

  ACTIVE_VIEW = "inbox";
  
  // By default, load the inbox
  load_mailbox(ACTIVE_VIEW);
  
  // Prevent resubmission on page refresh
  if ( window.history.replaceState ) {
    window.history.replaceState( null, null, window.location.href );
  }
});

// Initialize APP STATE
let ACTIVE_VIEW;
const MAILBOX = {
  active: [],
  inbox: [],
  sent: [],
  archive: [],
  step: 0,
  stepSize: 30,
  filters: {
    unreadOnly: false,
    sender: null,
    subject: null,
  }
};

function next_page(e) {
  e.target.blur();

  if (MAILBOX.step + 1 === Math.ceil(MAILBOX.active.length / MAILBOX.stepSize)) {
    return;
  }

  MAILBOX.step++;
  render_mails();
}

function prev_page(e) {
  e.target.blur();

  if (MAILBOX.step <= 0) {
    return;
  }

  MAILBOX.step--;
  render_mails();
}

function set_active() {
  document.querySelector('#mailbox-name').innerHTML = `${ACTIVE_VIEW.charAt(0).toUpperCase() + ACTIVE_VIEW.slice(1)}`;

  const siblings = Array.from(document.querySelector("#navbar").children);
  let index = 0;
  siblings.forEach(function(s, i) {
    s.classList.remove("active");
    if (s.id === ACTIVE_VIEW) {
      index = i;
    }
  });
  siblings[index].classList.add("active");
}

async function email_details(e, id) {
  function populate_fields(mail) {
    // Init Markdown
    const markdowner = new Markdown();

    document.querySelector("#email-subject").textContent = mail.subject || "(no subject)";
    document.querySelector("#email-sender").textContent = mail.sender;
    document.querySelector("#email-timestamp").textContent = mail.timestamp;
    document.querySelector("#email-body").innerHTML = markdowner.convert(mail.body) || "(empty)";
    document.querySelector("#email-recipient").textContent = mail.recipients.join(", ");
  
    // init reply button
    document.querySelector("#email-reply").onclick = function(){compose_email(mail)};
  }

  function clear_fields() {
    document.querySelector("#email-subject").textContent = "";
    document.querySelector("#email-sender").textContent = "";
    document.querySelector("#email-timestamp").textContent = "";
    document.querySelector("#email-body").textContent = "";
    document.querySelector("#email-recipient").textContent = "";
  }

  // clear all fields
  clear_fields();

  // show email view, hide others
  change_view_to("email-view");

  try {
    const URL = "/emails/" + id;
    // API call to fetch email details (not necessary as we cache them in MAILBOX but it is in requirements)
    let res = await fetch(URL);
    let mail = await res.json();

    if (mail.error) {
      throw new Error(mail.error);
    }
    // Populate fields
    populate_fields(mail);
    // Update mail status
    if (!mail.read) {
      update_status(id, {read: true});
    }

  } catch (error) {
    // Pop up error alert
    show_toast(error);
  }


}

function compose_email(mail) {
  document.querySelector("#compose-submit").onclick = send_email;
  // Show compose view and hide other views
  change_view_to("compose-view");

  // Show the mailbox type name
  ACTIVE_VIEW = "compose";

  // Change view dependant elements and their styles
  set_active();

  if (mail) {
    // if mail provided, prepopulate fields
    prepolulate_form(mail);    
    // autofocus body field
    document.querySelector('#editor__raw--content').focus();
  } else {
    // Clear form input fields
    clear_form();
    // autofocus recipient field
    document.querySelector('#compose-recipients').focus();
  }


  document.querySelector("#compose-form").onsubmit = send_email;
}

async function load_mailbox(type) {
  let mails;
  // Clear table from tooltips
  $(".tooltip").tooltip("dispose");

  // Show the mailbox type and hide other views
  change_view_to("mailbox-view");

  // Use buttons to list through mailbox
  document.querySelector('#prev-page').onclick = function(e) { prev_page(e); };
  document.querySelector('#next-page').onclick = function(e) { next_page(e); };

  // unread filter
  MAILBOX.filters.unreadOnly = document.querySelector("#unread-only-filter").checked;
  document.querySelector("#unread-only-filter").onchange = function(e) { MAILBOX.filters.unreadOnly = e.target.checked; render_mails(); }

  // Set active view and reset step count
  ACTIVE_VIEW = type;
  MAILBOX.step = 0;

  // Set active tabs in navigation
  set_active();

  // API call to get all mails within specified mailbox
  try {
    const response = await fetch("/emails/" + type);
    mails = await response.json();
    if (mails.error) {
      throw new Error(mails.error);
    }

  } catch (error) {
    show_toast(error);
  }
  
  if (mails.length === 0) {
    // clear table
    Array.from(document.querySelector('#mailbox-table-list').children).forEach(function(item) {
      item.remove();
    });
    return;
  };

  MAILBOX[type] = [...mails]
  
  // // Sort by date
  // MAILBOX[type] = MAILBOX[type].sort(function(a, b) {
    //   return new Date(a.timestamp).getTime() < new Date(b.timestamp).getTime();
    // });
    
    // Finally render mails in table
    render_mails();

}

function render_mails() {
  const table_body = document.querySelector('#mailbox-table-list');
  MAILBOX.active = [...MAILBOX[ACTIVE_VIEW]];

  if (MAILBOX.filters.unreadOnly) {
    MAILBOX.active = MAILBOX.active.filter(function(mail) {
      return !mail.read;
    });
  }

  // get slice of mailbox depending on current step
  let mails = MAILBOX.active.slice(MAILBOX.step * MAILBOX.stepSize, MAILBOX.step * MAILBOX.stepSize + MAILBOX.stepSize);
  // decide how many times to loop
  const size = mails.length >= table_body.rows.length ? mails.length : table_body.rows.length;

  for (let index = 0; index < size; index++) {
    // if there is mail
    if (mails[index]) {
      const new_row = create_mailbox_item(mails[index]); 
      // if there already is rendered mail at this position, replace it with another
      if (table_body.rows[index] !== undefined) {
        let old_row = table_body.rows[index];
        table_body.replaceChild(new_row, old_row);
      // if not, append new one
      } else {
        table_body.appendChild(new_row);
      }
      continue;
    }
    // remove surplus mails from the table
    table_body.deleteRow(-1);
  }
    
  // Display toolbar info
  update_table_info();

  // Initialize tooltips
  $(function () {
    $('[data-toggle="tooltip"]').tooltip({
      delay: {
        show: 1000,
        hide: 100,
      },
      placement: "bottom",
      trigger: "hover focus",
    })
  })
}

function create_mailbox_item(content) {
  // ROW
  let row = createEl("tr", "mailbox-row");
  content.read && row.classList.add("read");
  row.setAttribute("tabindex", "0");
  row.setAttribute("role", "row");
  row.onclick = function(e) { email_details(e, content.id) };

  // TABLE CELLs
  let sender = createEl("td", "sender");
  let senderRegexp = /^[-.\w]+/;
  sender.innerHTML = content.sender.match(senderRegexp);
  sender.setAttribute("title", content.sender);

  let subject = createEl("td", "subject");
  subject.innerHTML = content.subject || "(no subject)";
  
  let date = createEl("td", "date");
  date.innerHTML = content.timestamp;

  let id = createEl("td", "id d-none");
  id.setAttribute("scope","col")
  id.innerHTML = content.id;
  
  // ACTION LIST
  let actionList = createEl("td", "action-list");

  let list = createEl("ul");

  // If active view is "sent" DO NOT create/render archive button
  if (ACTIVE_VIEW !== "sent") {
    let archive = createEl("li");

    if (!content.archived) {
      archive.classList.add("ar");
      archive.setAttribute("title", "Archive")
      archive.dataset.toggle = "tooltip";
      archive.setAttribute("tabindex", "0");
      archive.onclick = async function(e) {
        e.stopPropagation();
        await update_status(content.id, {archived: true},"Email archived.");
        load_mailbox(ACTIVE_VIEW);
      };
  
    } else {
      archive.classList.add("ua");
      archive.setAttribute("title", "Unarchive")
      archive.dataset.toggle = "tooltip";
      archive.setAttribute("tabindex", "0");
      archive.onclick = async function(e) {
        e.stopPropagation();
        await update_status(content.id, {archived: false}, "Email unarchived.");
        load_mailbox(ACTIVE_VIEW);
      };  
    }

  list.append(archive);
  }

  let read = createEl("li");

  if (content.read) {
    read.classList.add("re");
    read.setAttribute("title", "Mark as unread")
    read.dataset.toggle = "tooltip";
    read.setAttribute("tabindex", "0");
    read.onclick = async function(e) {
      e.stopPropagation();
      await update_status(content.id, {read: false},"Email marked as unread.");
      load_mailbox(ACTIVE_VIEW);
    };

  } else {
    read.classList.add("ur");
    read.setAttribute("title", "Mark as read");
    read.dataset.toggle = "tooltip";
    read.setAttribute("tabindex", "0");
    read.onclick = async function(e) {
      e.stopPropagation();
      await update_status(content.id, {read: true},"Email marked as read.");
      load_mailbox(ACTIVE_VIEW);
    };
  
  }

  // APPENDING  
  list.append(read);
  actionList.append(list);

  row.append(id);
  row.append(sender);
  row.append(subject);
  row.append(date);
  row.append(actionList);

  return row;
}

function createEl(tagName, className) {
  const el = document.createElement(tagName);
  if (className) {
    el.className = className;
  }
  return el;
}

function change_view_to(name) {
  // select views container
  const main_view = document.querySelector("#main-view");
  // init var for position in list of view to be shown
  let pos;
  // First, hide all views and get pos in meantime
  const views = Array.from(main_view.children);
  views.forEach(function(view, i) {
    if(view.id === name) {
      pos = i;
    }
    view.style.display = "none";
  });
  // Show desirable view
  views[pos].style.display = "block";

  // Show/hide mailbox info
  if (name !== "mailbox-view") {
    document.querySelector("#mailbox-info").classList.add("hide");
  } else {
    document.querySelector("#mailbox-info").classList.remove("hide");
  }

}

async function update_status(id, body, msg) {
  try {
    const URL = "/emails/" + id;
    // API call to update "read" status of particular email
    const res = await fetch(URL, {
      method: "PUT",
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      throw new Error(res.error);
    }

    if (msg) {
      show_toast(msg);
    }

  } catch (error) {
    // Pop up error alert
    show_toast(error);
  }
}

function show_toast(msg) {
  const cont = document.querySelector("#toast-container");
  const toast = createEl("div", "toast");
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");
  toast.dataset.delay = 10000;
  toast.innerHTML = `
    <div class="toast-header">
      <strong class="mr-auto">Notification</strong>
      <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
    <div class="toast-body">
      ${msg}
    </div>`

  cont.append(toast);

  $(toast).toast("show");
}

function update_table_info() {
    // Display toolbar info
    let size = (MAILBOX.step * MAILBOX.stepSize + MAILBOX.stepSize) < MAILBOX.active.length ? (MAILBOX.step * MAILBOX.stepSize + MAILBOX.stepSize) : MAILBOX.active.length;
    document.querySelector("#mailbox-size").innerHTML = `${MAILBOX.step * MAILBOX.stepSize} - ${size} of ${MAILBOX.active.length}`;
}

async function send_email(e) {
  e.preventDefault();
    // Init form input fields
  const compose_recipients = document.querySelector('#compose-recipients');
  const compose_subject = document.querySelector('#compose-subject');
  const compose_body = document.querySelector('#editor__raw--content');

  // API call to send mail
  try {
    const response = await fetch("/emails", {
      method: "POST",
      body: JSON.stringify({
        recipients: compose_recipients.value,
        subject: compose_subject.value,
        body: compose_body.value,
      })
    });
    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }   

    show_toast(result.message);
    
    clear_form();

  } catch (error) {
    show_toast(error);
  }
};

function prepolulate_form(mail) {
  document.querySelector('#compose-recipients').value = mail.sender;
  document.querySelector('#compose-subject').value = mail.subject.match(/^Re:/) ? mail.subject : "Re: " + mail.subject;
  document.querySelector('#editor__raw--content').value = `**On ${mail.timestamp} ${mail.sender} wrote:**\n${mail.body}`;
}

function clear_form() {
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#editor__raw--content').value = '';
  document.querySelector("#editor__preview--content").innerHTML = "";
}