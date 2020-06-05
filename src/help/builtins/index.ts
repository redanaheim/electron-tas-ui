import { get_builtin } from "../../assets/compiling_builtins/builtin_names";

export const set_contents = function (builtin_name: string): void {
  const builtin_obj = get_builtin(builtin_name);
  if (builtin_obj instanceof Array && builtin_obj.length === 0) {
    // get_builtins returns an empty value if there is no such builtin name
    return;
  }
  const contents_div = $("#contents_box");
  // clear existing content
  contents_div.html("");
  let counter = 0;
  for (const macro of builtin_obj) {
    counter++;
    contents_div.append(
      $("<p/>")
        .text(`${counter}. `)
        .append($("<code/>").text(macro.name))
        .append(
          $("<p/>").html(macro.description ? `${macro.description}<br>` : "")
        )
        .append(
          $("<code/>")
            .addClass("block")
            .html(macro.internal_actions.join("<br>"))
        )
    );
  }
};
