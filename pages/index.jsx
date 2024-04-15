import Head from "next/head";
import Layout, { siteTitle } from "../components/layout";
import utilStyles from "../styles/utils.module.css";
import Link from "next/link";
import Date from "../components/date";
import prisma from "../lib/prisma";

export default function Home({ feed }) {
    return (
        <Layout home>
            <Head>
                <title>{siteTitle}</title>
            </Head>
            <section className={utilStyles.headingMd}>
                <p>Prisma go Brrr</p>
            </section>
            <section
                className={`${utilStyles.headingMd} ${utilStyles.padding1px}`}
            >
                <h2 className={utilStyles.headingLg}>Blog</h2>
                <ul className={utilStyles.list}>
                    {
                        feed && feed.map(({ id, date, title, user }) => (
                        <li className={utilStyles.listItem} key={id}>
                            <Link href={`/posts/${id}`}>{title}</Link>
                            <br />
                            <small className={utilStyles.lightText}>
                                    <Date dateString={date} />
                                    &nbsp;
                                    By {user.name}
                            </small>
                        </li>
                    ))}
                </ul>
            </section>
        </Layout>
    );
}

export const getStaticProps = async () => {
    let feed;
    
    try {
    feed = await prisma.post.findMany({
      include: {
        user: {
          select: { name: true },
        },
      },
    });
    }
    catch (error) {
        console.error(error);
    }

    feed.forEach((post) => {
        post.date = post.date.toISOString();
      }
      );

    return {
      props: { feed },
      revalidate: 10,
    };
};
