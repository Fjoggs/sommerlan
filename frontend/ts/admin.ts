const lanForm = document.getElementById("lanForm");

const onSubmitGame = async (event: SubmitEvent) => {
  const gameForm: HTMLFormElement = document.getElementById(
    "gameForm",
  ) as HTMLFormElement;
  event.preventDefault();

  const formData = new FormData(gameForm);
  console.log("formDAta", formData);

  const res = await fetch("http://localhost:8080/api/game/", {
    method: "POST",
    body: formData,
  });
  console.log("res.status", res.status);
};

const gameForm: HTMLFormElement = document.getElementById(
  "gameForm",
) as HTMLFormElement;
gameForm?.addEventListener("submit", onSubmitGame);

lanForm?.addEventListener("submit", onSubmitGame);
