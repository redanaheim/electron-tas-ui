export const find_average = function (x: number, y: number): number {
  return (x + y) / 2;
};
export const on_change = function (): void {
  $("#out").html(
    find_average(
      Number($("#lower").val()),
      Number($("#upper").val())
    ).toString()
  );
};
export const change_range = (is_up: boolean): void => {
  if (is_up) {
    $("#lower").val($("#out").text());
  } else {
    $("#upper").val($("#out").text());
  }
  on_change();
};
