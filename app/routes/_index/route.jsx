import { redirect, Form, useActionData, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import { loginErrorMessage } from "../auth.login/error.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export const action = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export default function App() {
  const { showForm } = useLoaderData();
  const actionData = useActionData();
  const errors = actionData?.errors;

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Chopi - Menu</h1>
        <p className={styles.text}>
          Design a mobile menu that sells, without touching theme code.
        </p>
        {showForm && (
          <Form className={styles.form} method="post">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>{errors?.shop ?? "e.g: my-shop-domain.myshopify.com"}</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Ready-made templates</strong>. Start from a proven mobile
            menu design and make it yours.
          </li>
          <li>
            <strong>Visual editor</strong>. Drag in widgets like story circles,
            category cards and banners, with a live preview.
          </li>
          <li>
            <strong>Works with your theme</strong>. Turn on the app embed and
            your new menu replaces the theme&apos;s mobile menu.
          </li>
        </ul>
      </div>
    </div>
  );
}
